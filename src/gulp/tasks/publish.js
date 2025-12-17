// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('publish');
const { series } = require('gulp');
const jetpack = require('fs-jetpack');
const path = require('path');
const { execute } = require('node-powertools');

// Load package
const project = Manager.getPackage('project');

// Paths for each target
const PATHS = {
  chromium: {
    zip: path.join(process.cwd(), 'packaged', 'chromium', 'extension.zip'),
    raw: path.join(process.cwd(), 'packaged', 'chromium', 'raw'),
  },
  firefox: {
    zip: path.join(process.cwd(), 'packaged', 'firefox', 'extension.zip'),
    raw: path.join(process.cwd(), 'packaged', 'firefox', 'raw'),
  },
  opera: {
    zip: path.join(process.cwd(), 'packaged', 'opera', 'extension.zip'),
    raw: path.join(process.cwd(), 'packaged', 'opera', 'raw'),
  },
};

// Helper to check if a credential is valid (not empty or placeholder)
function isValidCredential(value) {
  return value && !value.startsWith('your-');
}

// Store configurations - all credentials come from .env file
const STORES = {
  chrome: {
    name: 'Chrome Web Store',
    submitUrl: 'https://chrome.google.com/webstore/devconsole',
    apiUrl: 'https://developer.chrome.com/docs/webstore/using_webstore_api/',
    enabled: () => isValidCredential(process.env.CHROME_EXTENSION_ID) && isValidCredential(process.env.CHROME_CLIENT_ID),
  },
  firefox: {
    name: 'Firefox Add-ons',
    submitUrl: 'https://addons.mozilla.org/en-US/developers/addon/submit/distribution',
    apiUrl: 'https://addons.mozilla.org/developers/addon/api/key/',
    enabled: () => isValidCredential(process.env.FIREFOX_API_KEY) && isValidCredential(process.env.FIREFOX_API_SECRET),
  },
  edge: {
    name: 'Microsoft Edge Add-ons',
    submitUrl: 'https://partner.microsoft.com/dashboard/microsoftedge/',
    apiUrl: 'https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api',
    enabled: () => isValidCredential(process.env.EDGE_PRODUCT_ID) && isValidCredential(process.env.EDGE_CLIENT_ID),
  },
  opera: {
    name: 'Opera Add-ons',
    submitUrl: 'https://addons.opera.com/developer/',
    apiUrl: null,
    enabled: () => false, // No API available
  },
  brave: {
    name: 'Brave (via Chrome Web Store)',
    submitUrl: 'https://chrome.google.com/webstore/devconsole',
    apiUrl: null,
    enabled: () => false, // Uses Chrome Web Store - no separate store
    note: 'Brave uses Chrome Web Store directly. Publishing to Chrome makes extension available in Brave.',
  },
};

// Main publish task
async function publish(complete) {
  // Check if publish mode is enabled
  if (!process.env.BXM_IS_PUBLISH) {
    logger.log('Skipping publish (BXM_IS_PUBLISH not set)');
    return complete();
  }

  // Log
  logger.log('Starting publish...');

  // Check if zips exist for each target
  const missingZips = Object.entries(PATHS)
    .filter(([, paths]) => !jetpack.exists(paths.zip))
    .map(([target]) => target);

  if (missingZips.length > 0) {
    logger.error(`Extension zips not found for: ${missingZips.join(', ')}. Run build first.`);
    return complete();
  }

  // Log version
  logger.log(`Publishing version ${project.version}`);

  // Get enabled stores
  const enabledStores = Object.entries(STORES)
    .filter(([, store]) => store.enabled())
    .map(([key]) => key);

  // If no stores are configured, error and show all store info
  if (enabledStores.length === 0) {
    logger.error('No stores configured for publishing. Add credentials to .env file');
    logger.log('');
    logger.log('Store URLs and API documentation:');
    Object.entries(STORES).forEach(([, store]) => {
      logger.log(`  ${store.name}:`);
      logger.log(`    Submit: ${store.submitUrl}`);
      if (store.apiUrl) {
        logger.log(`    API:    ${store.apiUrl}`);
      } else if (store.note) {
        logger.log(`    Note:   ${store.note}`);
      } else {
        logger.log(`    API:    N/A (manual submission only)`);
      }
    });
    throw new Error('No stores configured for publishing');
  }

  logger.log(`Publishing to: ${enabledStores.join(', ')}`);

  // Track results
  const results = {
    success: [],
    failed: [],
  };

  // Run publish tasks in parallel
  const publishTasks = enabledStores.map(async (store) => {
    try {
      switch (store) {
        case 'chrome':
          await publishToChrome();
          break;
        case 'firefox':
          await publishToFirefox();
          break;
        case 'edge':
          await publishToEdge();
          break;
      }
      logger.log(`[${store}] Published successfully`);
      results.success.push(store);
    } catch (e) {
      logger.error(`[${store}] Publish failed: ${e.message}`);
      results.failed.push(store);
    }
  });

  await Promise.all(publishTasks);

  // Log completion and show all store URLs
  logger.log('');
  logger.log('Store URLs:');
  Object.entries(STORES).forEach(([key, store]) => {
    let status = '○ Manual';
    if (results.success.includes(key)) {
      status = '✓ Published';
    } else if (results.failed.includes(key)) {
      status = '✗ Failed';
    } else if (store.note) {
      status = '○ ' + store.note.split('.')[0]; // First sentence of note
    }
    logger.log(`  ${store.name}: ${status}`);
    logger.log(`    Submit: ${store.submitUrl}`);
    if (store.apiUrl) {
      logger.log(`    API:    ${store.apiUrl}`);
    }
  });

  // Throw error if any failed
  if (results.failed.length > 0) {
    throw new Error(`Publish failed for: ${results.failed.join(', ')}`);
  }

  // Log
  logger.log('');
  logger.log('Publish finished!');

  // Complete
  return complete();
}

// Publish to Chrome Web Store
async function publishToChrome() {
  // Get credentials from env
  const extensionId = process.env.CHROME_EXTENSION_ID;
  const clientId = process.env.CHROME_CLIENT_ID;
  const clientSecret = process.env.CHROME_CLIENT_SECRET;
  const refreshToken = process.env.CHROME_REFRESH_TOKEN;

  // Validate
  if (!extensionId || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Chrome credentials. Set CHROME_EXTENSION_ID, CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN in .env');
  }

  logger.log('[chrome] Uploading to Chrome Web Store...');

  // Use chrome-webstore-upload-cli with chromium build
  const command = [
    'npx chrome-webstore-upload-cli',
    `--source "${PATHS.chromium.zip}"`,
    `--extension-id "${extensionId}"`,
    `--client-id "${clientId}"`,
    `--client-secret "${clientSecret}"`,
    `--refresh-token "${refreshToken}"`,
  ].join(' ');

  await execute(command);

  logger.log('[chrome] Upload complete');
}

// Publish to Firefox Add-ons
async function publishToFirefox() {
  // Get credentials from env
  const extensionId = process.env.FIREFOX_EXTENSION_ID;
  const apiKey = process.env.FIREFOX_API_KEY;
  const apiSecret = process.env.FIREFOX_API_SECRET;
  const channel = process.env.FIREFOX_CHANNEL || 'listed';

  // Validate
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Firefox credentials. Set FIREFOX_API_KEY, FIREFOX_API_SECRET in .env');
  }

  logger.log('[firefox] Uploading to Firefox Add-ons...');

  // Use web-ext sign with firefox build
  const command = [
    'npx web-ext sign',
    `--source-dir "${PATHS.firefox.raw}"`,
    `--api-key "${apiKey}"`,
    `--api-secret "${apiSecret}"`,
    `--channel "${channel}"`,
    extensionId ? `--id "${extensionId}"` : '',
  ].filter(Boolean).join(' ');

  await execute(command);

  logger.log('[firefox] Upload complete');
}

// Publish to Microsoft Edge Add-ons
async function publishToEdge() {
  // Get credentials from env
  const productId = process.env.EDGE_PRODUCT_ID;
  const clientId = process.env.EDGE_CLIENT_ID;
  const apiKey = process.env.EDGE_API_KEY;

  // Validate
  if (!productId || !clientId || !apiKey) {
    throw new Error('Missing Edge credentials. Set EDGE_PRODUCT_ID, EDGE_CLIENT_ID, EDGE_API_KEY in .env');
  }

  logger.log('[edge] Uploading to Microsoft Edge Add-ons...');

  // Read chromium zip file (Edge uses same build as Chrome)
  const zipBuffer = jetpack.read(PATHS.chromium.zip, 'buffer');

  // Edge API v1.1 endpoint
  const uploadUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/draft/package`;

  // Upload using fetch
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'X-ClientID': clientId,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge API error: ${response.status} - ${errorText}`);
  }

  logger.log('[edge] Package uploaded, submitting for review...');

  // Submit for review
  const publishUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'X-ClientID': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes: `Automated publish of version ${project.version}`,
    }),
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    throw new Error(`Edge publish error: ${publishResponse.status} - ${errorText}`);
  }

  logger.log('[edge] Upload complete');
}

// Export task
module.exports = series(publish);
