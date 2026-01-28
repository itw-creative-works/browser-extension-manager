// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('webpack');
const { watch, series } = require('gulp');
const glob = require('glob').globSync;
const path = require('path');
const wp = require('webpack');
const ReplacePlugin = require('../plugins/webpack/replace.js');
const stripDevBlocksLoader = require.resolve('../loaders/webpack/strip-dev-blocks-loader.js');
const version = require('wonderful-version');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const config = Manager.getConfig();
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Define bundle files separately for easier tracking
const bundleFiles = [
  // Main bundles (if any exist in bundles/ directory)
  `${rootPathPackage}/dist/assets/js/bundles/*.js`,

  // Project bundles
  'src/assets/js/bundles/*.js',
];

// Entry points to compile (only index.js files)
const input = [
  // Bundle files (if any exist)
  ...bundleFiles,

  // Component-specific JS (only index.js entry points)
  `${rootPathPackage}/dist/assets/js/components/**/index.js`,
  'src/assets/js/components/**/index.js',
];

// Additional files to watch (but not compile as entry points)
const watchInput = [
  // Watch the paths we're compiling
  ...input,

  // Core JS - watch for changes but don't compile as entry points
  `${rootPathPackage}/dist/assets/js/**/*.js`,
  `${rootPathProject}/src/assets/js/**/*.js`,

  // Theme js - watch for changes but don't compile as entry points
  `${rootPathPackage}/dist/assets/themes/**/*.js`,
  'src/assets/themes/**/*.js',

  // All project assets js - watch for changes but don't compile as entry points
  'src/assets/js/**/*.js',

  // All BXM package src files - watch for changes (includes background.js, popup.js, etc.)
  `${rootPathPackage}/src/**/*.js`,

  // So we can watch for changes while we're developing web-manager
  `${rootPathPackage}/../web-manager/src`,
];

const delay = 250;
const compiled = {};

// Bundle naming configuration
const bundleNaming = {
  // Files that should have stable (non-hashed) names
  stable: [
    /^bundles\//,                  // All bundle files get stable names
    /^components\//,               // All component files get stable names
    /^pages\//,                    // All page files get stable names
  ],
  // Special output paths (relative to dist/assets/js/)
  specialPaths: {
    // Example: 'components/background': 'background.js'
    // Can be configured per project if needed
  }
};

// Helper function to determine if a bundle should have a stable name
function shouldHaveStableName(name) {
  return bundleNaming.stable.some(pattern => pattern.test(name));
}

// Helper function to get webpack settings (called at runtime)
function getSettings() {
  return {
    mode: Manager.actLikeProduction() ? 'production' : 'development',
    target: ['web', 'es2015'],
    // Browser extensions have CSP restrictions, so use source-map instead of eval-source-map
    devtool: Manager.actLikeProduction() ? false : 'source-map',
    plugins: [
      new ReplacePlugin(getTemplateReplaceOptions(), { type: 'template' }),
    ],
    entry: {
      // Entry is dynamically generated
    },
    resolve: {
      alias: {
        // For importing assets
        '__main_assets__': path.resolve(rootPathPackage, 'dist/assets'),
        '__project_assets__': path.resolve(process.cwd(), 'src/assets'),

        // For importing the theme
        '__theme__': path.resolve(rootPathPackage, 'dist/assets/themes', config.theme?.id || 'classy'),
      },
      // Add module resolution paths
      modules: [
        // Local web-manager's node_modules (for when we're using "web-manager": "file:../web-manager")
        path.resolve(rootPathPackage, '../web-manager/node_modules'),

        // Package's node_modules
        path.resolve(rootPathPackage, 'node_modules'),

        // Project's node_modules
        path.resolve(process.cwd(), 'node_modules'),
        'node_modules' // Default fallback
      ],
      // Fallbacks for Node.js modules that don't work in the browser
      fallback: {
        fs: false,
        path: false,
        crypto: false,
        os: false,
        util: false,
        assert: false,
        stream: false,
        buffer: false,
        process: false
      }
    },
    output: {
      // Set the path to the dist folder
      path: path.resolve(process.cwd(), 'dist/assets/js'),

      // Set the public path
      publicPath: '/assets/js/',

      // https://github.com/webpack/webpack/issues/959
      chunkFilename: (data) => {
        const name = data.chunk.name;

        // Check if this chunk should have a stable name
        if (shouldHaveStableName(name)) {
          return '[name].chunk.js';
        }

        // Otherwise, use hashed filename
        return '[name].chunk.[chunkhash].js';
      },
      filename: (data) => {
        const name = data.chunk.name;

        // Check for special output paths (like service worker)
        if (bundleNaming.specialPaths[name]) {
          return bundleNaming.specialPaths[name];
        }

        // Check if this bundle should have a stable name
        if (shouldHaveStableName(name)) {
          return '[name].bundle.js';
        }

        // Everything else gets hashed
        return '[name].bundle.[contenthash].js';
      },
    },
    resolveLoader: {
      modules: [
        path.resolve(process.cwd(), 'node_modules', package.name, 'node_modules'), // Path to your helper module's node_modules
        path.resolve(process.cwd(), 'node_modules'), // Default project node_modules
        'node_modules', // Fallback to global
      ]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                sourceMaps: !Manager.actLikeProduction(),
                presets: [
                  [require.resolve('@babel/preset-env', {
                    paths: [path.resolve(process.cwd(), 'node_modules', package.name, 'node_modules')]
                  }), {
                    exclude: [
                      // Prevent lighthouse error in 2025 about Legacy JavaScript
                      // 'es.array.from',
                    ]
                  }]
                ],
                compact: Manager.isBuildMode(),
              }
            },
            // Strip dev-only blocks before babel processes the file
            stripDevBlocksLoader,
          ]
        }
      ]
    },
    optimization: {
      minimize: Manager.actLikeProduction(),
    },
  };
}

// Task
function webpack(complete) {
  // Get settings (loads config at runtime)
  const settings = getSettings();

  // Log
  logger.log('Starting...');
  Manager.logMemory(logger, 'Start');

  // Log mode and devtools
  logger.log(`Mode: ${settings.mode}`);
  logger.log(`Target: ${settings.target[1]}`);
  logger.log(`Devtool: ${settings.devtool}`);

  // Build configs array
  const configs = [];

  // Main entries config
  const mainEntries = updateEntryPoints(input);
  if (Object.keys(mainEntries).length > 0) {
    configs.push({
      ...settings,
      entry: mainEntries
    });
  }

  // Check if we have a background component that needs service worker config
  const hasBackgroundComponent = Object.keys(mainEntries).some(key =>
    key === 'components/background' || key.includes('components/background/')
  );

  if (hasBackgroundComponent) {
    // Create separate config for background with service worker settings
    const backgroundEntry = {};
    Object.keys(mainEntries).forEach(key => {
      if (key === 'components/background' || key.includes('components/background/')) {
        backgroundEntry[key] = mainEntries[key];
        delete mainEntries[key];
      }
    });

    configs.push({
      ...settings,
      entry: backgroundEntry,
      output: {
        ...settings.output,
        // Set global object for service worker
        globalObject: 'self',
        // Service worker output format - use umd to avoid module issues
        libraryTarget: 'umd',
      },
      target: 'webworker',
      optimization: {
        ...settings.optimization,
        // Disable runtime chunk for service worker
        runtimeChunk: false,
        // Disable splitting for service worker to avoid chunk loading issues
        splitChunks: false
      }
    });
  }

  // Check if we have a content component that needs special config
  // Content scripts run in web page context and can't dynamically load chunks due to CSP
  const hasContentComponent = Object.keys(mainEntries).some(key =>
    key === 'components/content' || key.includes('components/content/')
  );

  if (hasContentComponent) {
    // Create separate config for content scripts
    const contentEntry = {};
    Object.keys(mainEntries).forEach(key => {
      if (key === 'components/content' || key.includes('components/content/')) {
        contentEntry[key] = mainEntries[key];
        delete mainEntries[key];
      }
    });

    configs.push({
      ...settings,
      entry: contentEntry,
      optimization: {
        ...settings.optimization,
        // Disable runtime chunk for content scripts
        runtimeChunk: false,
        // Disable splitting for content scripts to avoid chunk loading issues
        // Content scripts can't dynamically load chunks due to page CSP restrictions
        splitChunks: false
      }
    });
  }

  // Compiler
  wp(configs, (e, stats) => {
    // Log
    logger.log('Finished!');

    // Handle fatal webpack errors
    if (e) {
      logger.error('Fatal webpack error:', e);
      return Manager.reportBuildError(Object.assign(e, { plugin: 'Webpack' }), complete);
    }

    // Log stats
    const statsString = stats.toString({ colors: true });
    logger.log('Stats:\n', statsString);

    // Check for compilation errors
    if (stats.hasErrors()) {
      const info = stats.toJson();
      logger.error('Webpack compilation failed with errors');
      // Create an error to pass to complete() so the build fails
      const compilationError = new Error(`Webpack compilation failed: ${info.errors.length} error(s)`);
      return Manager.reportBuildError(Object.assign(compilationError, { plugin: 'Webpack' }), complete);
    }

    // Check for warnings (optional - don't fail build but log them)
    if (stats.hasWarnings()) {
      const info = stats.toJson();
      logger.warn(`Webpack compilation completed with ${info.warnings.length} warning(s)`);
    }

    // Trigger rebuild
    Manager.triggerRebuild(compiled);

    // Complete successfully
    return complete();
  });
}

// Watcher task
function webpackWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(watchInput, { delay: delay, dot: true }, webpack)
  .on('change', (path) => {
    // Log
    logger.log(`[watcher] File changed (${path})`);
  });

  // Complete
  return complete();
}

function updateEntryPoints(inputArray) {
  // Get all JS files
  const files = glob(inputArray).map((f) => path.resolve(f));

  // Sort: main files first
  files.sort((a, b) => {
    const aIsMain = a.startsWith(rootPathPackage);
    const bIsMain = b.startsWith(rootPathPackage);
    return aIsMain === bIsMain ? 0 : aIsMain ? -1 : 1;
  });

  // Update from src
  const entries = files.reduce((acc, file) => {
    let name;

    // Determine naming based on file type
    if (file.includes('/assets/js/bundles/')) {
      // Bundle files: bundles/my-bundle.js -> bundles/my-bundle
      name = file.split('/assets/js/')[1];
    } else if (file.includes('/assets/js/components/')) {
      // Component files: special handling for pages vs other components
      // Pages can have multiple files (index, pricing, login, etc.)
      // Other components (popup, options, etc.) only have index
      const componentPath = file.split('/assets/js/')[1];
      const isInPages = componentPath.includes('/pages/');

      if (componentPath.endsWith('/index.js') && !isInPages) {
        // For non-pages components: strip /index.js
        // components/popup/index.js -> components/popup
        const parts = componentPath.split('/');
        parts.pop(); // remove index.js
        name = parts.join('/');
      } else {
        // For pages or non-index files: keep full path
        // components/pages/index.js -> components/pages/index
        // components/pages/pricing.js -> components/pages/pricing
        name = componentPath.replace(/\.js$/, '');
      }
    } else if (file.includes('/assets/js/pages/')) {
      // Page files: keep full path
      name = file.split('/assets/js/')[1].replace(/\.js$/, '');
    } else {
      // Everything else: just use the base filename
      name = path.basename(file);
      name = name.replace(/\.js$/, '');
    }

    // Track the full output path
    const fullPath = path.resolve(process.cwd(), 'dist/assets/js', `${name}.bundle.js`);
    compiled[fullPath] = true;

    // Update entry points
    acc[name] = file;

    // Return
    return acc;
  }, {});

  // Log
  logger.log('Updated entry points:', entries);
  return entries;
}

function getTemplateReplaceOptions() {
  // Setup options
  const options = {
    // App & Project
    ...project,
    ...manifest,
    ...config,

    // Additional
    environment: Manager.getEnvironment(),

    // Specific
    firebaseVersion: version.clean(require('web-manager/package.json').dependencies.firebase),
    liveReloadPort: Manager.getLiveReloadPort(),
  }
  const now = Math.round(new Date().getTime() / 1000);

  // Set webManagerConfiguration (matching web-manager's expected structure)
  const webManagerConfig = options.webManager || {};
  options.webManagerConfiguration = JSON.stringify({
    environment: options.environment || 'production',
    buildTime: now,
    brand: {
      id: options.app?.id || 'extension',
      name: options.brand?.name || 'Extension',
      url: options.brand?.url || '',
      email: options.brand?.email || '',
      brandmark: options.brand?.brandmark || '',
      wordmark: options.brand?.wordmark || '',
      combomark: options.brand?.combomark || '',
    },
    auth: webManagerConfig.auth || { enabled: true, config: {} },
    firebase: {
      app: {
        enabled: !!(options.firebaseConfig?.apiKey || webManagerConfig.firebase?.app?.config?.apiKey),
        config: options.firebaseConfig || webManagerConfig.firebase?.app?.config || {},
      },
      appCheck: webManagerConfig.firebase?.appCheck || { enabled: false, config: {} },
    },
    cookieConsent: webManagerConfig.cookieConsent || { enabled: true, config: {} },
    chatsy: webManagerConfig.chatsy || { enabled: true, config: {} },
    sentry: webManagerConfig.sentry || {
      enabled: !!options.sentry?.dsn,
      config: options.sentry || {}
    },
    exitPopup: webManagerConfig.exitPopup || { enabled: false, config: {} },
    lazyLoading: webManagerConfig.lazyLoading || { enabled: true, config: {} },
    socialSharing: webManagerConfig.socialSharing || { enabled: false, config: {} },
    pushNotifications: webManagerConfig.pushNotifications || { enabled: false, config: {} },
    validRedirectHosts: webManagerConfig.validRedirectHosts || ['itwcreativeworks.com'],
    refreshNewVersion: webManagerConfig.refreshNewVersion || { enabled: true, config: {} },
    serviceWorker: webManagerConfig.serviceWorker || { enabled: false, config: {} },
  });

  // Return
  return options;
}

// function getRawReplaceOptions() {
//   const REDACTED = './REDACTED_REMOTE_CODE';

//   return {
//     'https://app.chatsy.ai/resources/script.js': REDACTED + 1,
//     // '/https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js\\?[^"\'\\s]*/g': REDACTED + 2,
//     'https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js': REDACTED + 2,
//     'https://www.google.com/recaptcha/enterprise.js': REDACTED + 3,
//     'https://apis.google.com/js/api.js': REDACTED + 4,
//     'https://www.google.com/recaptcha/api.js': REDACTED + 5,
//   }
// }

// Default Task
module.exports = series(webpack, webpackWatcher);
