// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('package');
const path = require('path');
const jetpack = require('fs-jetpack');
const { series, parallel, watch } = require('gulp');
const { execute, getKeys } = require('node-powertools');
const JSON5 = require('json5');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'dist/**/*',

  // Files to exclude
  // '!dist/**',
];
const output = 'dist';
const delay = 250;

// Special Compilation Task for manifest.json with default settings
async function compileManifest(outputDir) {
  try {
    const manifestPath = path.join('dist', 'manifest.json');
    const outputPath = path.join(outputDir, 'manifest.json');
    const configPath = path.join(rootPathPackage, 'dist', 'config', 'manifest.json');

    // Read and parse using JSON5
    const manifest = JSON5.parse(jetpack.read(manifestPath));
    const defaultConfig = JSON5.parse(jetpack.read(configPath));

    // Apply defaults
    getKeys(defaultConfig).forEach(key => {
      const defaultValue = key.split('.').reduce((o, k) => (o || {})[k], defaultConfig);
      const userValue = key.split('.').reduce((o, k) => (o || {})[k], manifest);

      if (Array.isArray(defaultValue) && Array.isArray(userValue)) {
        // Merge arrays
        const mergedArray = Array.from(new Set([...defaultValue, ...userValue]));
        key.split('.').reduce((o, k, i, arr) => {
          if (i === arr.length - 1) o[k] = mergedArray;
          else o[k] = o[k] || {};
          return o[k];
        }, manifest);
      } else if (userValue === undefined) {
        // Apply default if user value doesn't exist
        key.split('.').reduce((o, k, i, arr) => {
          if (i === arr.length - 1) o[k] = defaultValue;
          else o[k] = o[k] || {};
          return o[k];
        }, manifest);
      }
    });

    // Add package version to manifest
    manifest.version = project.version;

    // Save as regular JSON
    jetpack.write(outputPath, JSON.stringify(manifest, null, 2));

    logger.log(`Manifest compiled with defaults`);
  } catch (e) {
    logger.error(`Error compiling manifest`, e);
  }
}

// Special Compilation Task for _locales
async function compileLocales(outputDir) {
  try {
    const localesDir = path.join('dist', '_locales');
    const outputLocalesDir = path.join(outputDir, '_locales');

    // Ensure the directory exists
    jetpack.dir(outputLocalesDir);

    // Process each locale file
    jetpack.find(localesDir, { matching: '**/*.json' }).forEach(filePath => {
      const relativePath = path.relative(localesDir, filePath);
      const outputPath = path.join(outputLocalesDir, relativePath);

      // Read and parse using JSON5
      const localeData = JSON5.parse(jetpack.read(filePath));

      // Save as regular JSON
      jetpack.write(outputPath, JSON.stringify(localeData, null, 2));

      logger.log(`Locale compiled and saved: ${outputPath}`);
    });
  } catch (e) {
    logger.error(`Error compiling locales`, e);
  }
}

// Package Task for raw
async function packageRaw() {
  // Log
  logger.log(`Starting raw packaging...`);

  try {
    const outputDir = 'packaged/raw';

    // Ensure the directory exists
    jetpack.dir(outputDir);

    // Copy files to raw package directory
    await execute(`cp -r dist/* ${outputDir}`);

    // Loop thru outputDir/dist/assets/js all JS files
    const jsFiles = jetpack.find(path.join(outputDir, 'assets', 'js'), { matching: '*.js' });
    const redactions = getRedactions();

    jsFiles.forEach(filePath => {
      // Load the content
      let content = jetpack.read(filePath);

      // Replace keys with their corresponding values
      Object.keys(redactions).forEach(key => {
        const value = redactions[key];
        const regex = new RegExp(key, 'g'); // Create a global regex for the key
        content = content.replace(regex, value);

        // Log replacement
        logger.log(`Redacted ${key} in ${filePath}`);
      });

      // Write the new content to the file
      jetpack.write(filePath, content);
    });

    // Compile manifest and locales
    await compileManifest(outputDir);
    await compileLocales(outputDir);

    // Log completion
    logger.log(`Finished raw packaging`);
  } catch (e) {
    logger.error(`Error during raw packaging`, e);
  }
}

// Create zipped version of raw package
async function packageZip() {
  // Log
  logger.log(`Zipping raw package...`);

  try {
    const inputDir = 'packaged/raw';
    const zipPath = 'packaged/extension.zip';

    // Create packed extension (.zip)
    if (Manager.isBuildMode()) {
      await execute(`zip -r ${zipPath} ${inputDir}`);
      logger.log(`Zipped package created at ${zipPath}`);
    } else {
      logger.log(`Skipping zip (not in build mode)`);
    }
  } catch (e) {
    logger.error(`Error zipping package`, e);
  }
}

function liveReload() {
  // Log
  logger.log('Reloading live server clients...');

  // Quit if in build mode
  if (Manager.isBuildMode()) {
    return logger.log('Skipping live reload in non-build mode');
  }

  // Quit if no websocket server
  if (!global.websocket) {
    return logger.log('No live reload server found');
  }

  // Reload each client
  global.websocket.clients.forEach((client) => {
    // Get client IP
    const clientIp = client._socket?.remoteAddress || 'Unknown IP';

    // Log
    logger.log(`Sending to client at IP: ${clientIp}`);

    // Send
    client.send(JSON.stringify({ command: 'reload' }))
  })

  // Complete
  return;
}

// Package Task
async function packageFn(complete) {
  // Log
  logger.log('Starting...');

  // Run packageRaw
  await packageRaw();

  // Run packageZip
  await packageZip();

  // Run liveReload
  liveReload();

  // Log
  logger.log('Finished!');

  // Complete
  return complete();
}

// Watcher Task
function packageFnWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes in the dist folder
  watch(input, { delay: delay, dot: true }, packageFn)
    .on('change', function (path) {
      logger.log(`[watcher] File ${path} was changed`);
    });

  // Complete
  return complete();
}

// Export tasks
module.exports = series(packageFn, packageFnWatcher);

// Get redactions
function getRedactions() {
  const REDACTED = './REDACTED_REMOTE_CODE';

  return {
    'https://app.chatsy.ai/resources/script.js': REDACTED + 1,
    // '/https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js\\?[^"\'\\s]*/g': REDACTED + 2,
    'https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js': REDACTED + 2,
    'https://www.google.com/recaptcha/enterprise.js': REDACTED + 3,
    'https://apis.google.com/js/api.js': REDACTED + 4,
    'https://www.google.com/recaptcha/api.js': REDACTED + 5,
  }
}
