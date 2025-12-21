// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('publish');
const argv = Manager.getArguments();
const { series } = require('gulp');
const jetpack = require('fs-jetpack');
const path = require('path');
const { execute } = require('node-powertools');

// Load package
const project = Manager.getPackage('project');

// Helper to parse browser filter from --browser flag or BXM_BROWSER env var
// Returns array of browser names to publish to, or null for all
function getBrowserFilter() {
  // Check env var first (works across npm && chains), then CLI arg
  const browser = process.env.BXM_BROWSER || argv.browser;

  // If true or undefined, publish to all
  if (browser === true || browser === undefined) {
    return null;
  }

  // If false, publish to none
  if (browser === false) {
    return [];
  }

  // If string, parse comma-separated list
  if (typeof browser === 'string') {
    return browser.split(',').map((b) => b.trim().toLowerCase());
  }

  return null;
}

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

  // Get browser filter from --browser flag
  const browserFilter = getBrowserFilter();

  // Log filter if applied
  if (browserFilter) {
    logger.log(`Browser filter: ${browserFilter.join(', ') || 'none'}`);
  }

  // Get enabled stores (filtered by --browser flag if provided)
  const enabledStores = Object.entries(STORES)
    .filter(([key, store]) => {
      // Check if store is enabled via credentials
      if (!store.enabled()) {
        return false;
      }

      // If no filter, include all enabled stores
      if (!browserFilter) {
        return true;
      }

      // Check if this store is in the filter
      return browserFilter.includes(key);
    })
    .map(([key]) => key);

  // If no stores to publish to
  if (enabledStores.length === 0) {
    // Check if it's because of filter or missing credentials
    if (browserFilter && browserFilter.length > 0) {
      logger.error(`No matching stores for --browser=${browserFilter.join(',')}. Available: chrome, firefox, edge`);
    } else {
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
    }
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

  // Log what we're doing
  if (extensionId) {
    logger.log(`[firefox] Updating existing add-on: ${extensionId}`);
  } else {
    logger.log('[firefox] Creating new add-on (no FIREFOX_EXTENSION_ID set)');
    logger.log('[firefox] After publish, add FIREFOX_EXTENSION_ID to .env for future updates');
  }

  // Use web-ext sign with firefox build
  // --approval-timeout=0 to skip waiting for approval (can take minutes to hours)
  // --artifacts-dir to prevent leaving web-ext-artifacts folder in project root
  const artifactsDir = path.join(process.cwd(), '.temp', 'web-ext-artifacts');
  const command = [
    'npx web-ext sign',
    `--source-dir "${PATHS.firefox.raw}"`,
    `--artifacts-dir "${artifactsDir}"`,
    `--api-key "${apiKey}"`,
    `--api-secret "${apiSecret}"`,
    `--channel "${channel}"`,
    '--approval-timeout 0', // Don't wait for approval - it can take hours
    extensionId ? `--id "${extensionId}"` : '',
  ].filter(Boolean).join(' ');

  await execute(command);

  // Clean up artifacts dir
  jetpack.remove(artifactsDir);

  logger.log('[firefox] Upload complete (approval may take time)');
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

  // Helper for Edge API requests
  const edgeHeaders = {
    'Authorization': `ApiKey ${apiKey}`,
    'X-ClientID': clientId,
  };

  // Helper to parse Edge API response (handles empty bodies)
  async function parseEdgeResponse(response, label) {
    const text = await response.text();
    logger.log(`[edge] ${label} - Status: ${response.status}, Body: ${text || '(empty)'}`);

    if (!text) {
      return { status: response.status, data: null };
    }

    try {
      return { status: response.status, data: JSON.parse(text) };
    } catch (e) {
      return { status: response.status, data: text };
    }
  }

  // Step 1: Upload the package first
  logger.log('[edge] Uploading to Microsoft Edge Add-ons...');

  const zipBuffer = jetpack.read(PATHS.chromium.zip, 'buffer');
  const uploadUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/draft/package`;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...edgeHeaders,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer,
  });

  const upload = await parseEdgeResponse(uploadResponse, 'Upload response');

  if (!uploadResponse.ok) {
    throw new Error(`Edge upload error: ${upload.status} - ${JSON.stringify(upload.data)}`);
  }

  logger.log('[edge] Package uploaded, submitting for review...');

  // Step 2: Submit for review - this is where we'll get InProgressSubmission if there's a pending review
  const publishUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      ...edgeHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes: `Automated publish of version ${project.version}`,
    }),
  });

  const publish = await parseEdgeResponse(publishResponse, 'Publish response');

  // Check for HTTP errors (4xx, 5xx)
  if (!publishResponse.ok) {
    // Check if it's a 409 Conflict or similar indicating in-progress submission
    if (publish.status === 409) {
      throw new Error('Extension already has a pending submission in review. Wait for it to complete before publishing again.');
    }
    throw new Error(`Edge publish error: ${publish.status} - ${JSON.stringify(publish.data)}`);
  }

  // Check for API-level failures (HTTP 200/202 but status: "Failed" in body)
  if (publish.data && typeof publish.data === 'object') {
    if (publish.data.status === 'Failed') {
      if (publish.data.errorCode === 'InProgressSubmission') {
        throw new Error('Extension already has a pending submission in review. Wait for it to complete before publishing again.');
      }
      if (publish.data.errorCode === 'UnpublishInProgress') {
        throw new Error('Extension is being unpublished. Wait for unpublish to complete before publishing.');
      }
      throw new Error(`Edge publish failed: ${publish.data.message || publish.data.errorCode || 'Unknown error'}`);
    }
  }

  // HTTP 202 Accepted means submission was queued successfully
  if (publish.status === 202) {
    logger.log('[edge] Submission accepted and queued for review');
  }

  logger.log('[edge] Upload complete');
}

// Export task
module.exports = series(publish);
