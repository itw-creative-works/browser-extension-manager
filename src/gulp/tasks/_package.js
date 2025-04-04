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

// Supported browsers
const BROWSERS = ['chrome', 'firefox', 'opera'];

// Environment Check
const targetBrowser = process.env.BROWSER;
const isSpecificBrowser = targetBrowser && BROWSERS.includes(targetBrowser);

// Special Compilation Task for manifest.json with default settings
async function compileManifest(browser, complete) {
  try {
    const manifestPath = path.join('dist', 'manifest.json');
    const outputPath = path.join('packaged', browser, 'manifest.json');
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

    // Save as regular JSON
    jetpack.write(outputPath, JSON.stringify(manifest, null, 2));

    logger.log(`Manifest compiled with defaults and saved for ${browser}`);
  } catch (e) {
    logger.error(`Error compiling manifest for ${browser}`, e);
  }
  return complete();
}

// Special Compilation Task for _locales
async function compileLocales(browser, complete) {
  try {
    const localesDir = path.join('dist', '_locales');
    const outputDir = path.join('packaged', browser, '_locales');

    // Ensure the directory exists
    jetpack.dir(outputDir);

    // Process each locale file
    jetpack.find(localesDir, { matching: '**/*.json' }).forEach(filePath => {
      const relativePath = path.relative(localesDir, filePath);
      const outputPath = path.join(outputDir, relativePath);

      // Read and parse using JSON5
      const localeData = JSON5.parse(jetpack.read(filePath));

      // Save as regular JSON
      jetpack.write(outputPath, JSON.stringify(localeData, null, 2));

      logger.log(`Locale compiled and saved: ${outputPath}`);
    });
  } catch (e) {
    logger.error(`Error compiling locales for ${browser}`, e);
  }
  return complete();
}

// Package Task for Each Browser
async function packageBrowser(browser, complete) {
  // Log
  logger.log(`Starting packaging for ${browser}...`);

  try {
    const outputDir = `packaged/${browser}`;

    // Ensure the directory exists
    jetpack.dir(outputDir);

    // Perform any browser-specific adjustments if needed
    // await execute(`npx bxm setup --browser=${browser}`);

    // Copy files to browser-specific directory
    await execute(`cp -r dist/* ${outputDir}`);

    // Compile manifest and locales
    await compileManifest(browser, () => {});
    await compileLocales(browser, () => {});

    // Create packed extension (.zip)
    if (Manager.isBuildMode()) {
      await execute(`zip -r ${outputDir}.zip ${outputDir}`);
    }

    // Log completion
    logger.log(`Finished packaging for ${browser}`);
  } catch (e) {
    logger.error(`Error packaging for ${browser}`, e);
  }

  return complete();
}

// Generate tasks for each browser
const tasks = isSpecificBrowser
  ? [packageBrowser.bind(null, targetBrowser)]
  : BROWSERS.map((browser) => packageBrowser.bind(null, browser));

// Watcher Task
function packageWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes in the dist folder
  watch(input, { delay: delay }, parallel(...tasks))
    .on('change', function (path) {
      logger.log(`[watcher] File ${path} was changed`);
    });

  // Complete
  return complete();
}

// Export tasks
module.exports = series(
  parallel(...tasks),
  packageWatcher
);
