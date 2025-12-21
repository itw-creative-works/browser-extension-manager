// Libraries
const path = require('path');
const jetpack = require('fs-jetpack');
const fs = require('fs');
const JSON5 = require('json5');
const argv = require('yargs').argv;
const { force, execute } = require('node-powertools');

// Class
function Manager() {
  const self = this;

  // Properties
  self._logger = null;

  // Return
  return self;
}

// Initialize
Manager.prototype.initialize = function () {
  console.log('initialize:');
};

// Logger
Manager.prototype.logger = function (name) {
  // Check if called as static method (this is not a Manager instance)
  if (!(this instanceof Manager)) {
    // For static calls, just return a new logger without caching
    return new (require('./lib/logger'))(name);
  }

  // For instance calls, cache the logger
  if (!this._logger) {
    this._logger = new (require('./lib/logger'))(name);
  }

  return this._logger;
};

// argv
Manager.getArguments = function () {
  const options = argv || {};

  // Fix
  options._ = options._ || [];
  // browser can be: true (all), false (none), or a string like 'chrome' or 'chrome,firefox'
  options.browser = options.browser === undefined ? true : options.browser;
  options.debug = force(options.debug === undefined ? false : options.debug, 'boolean');

  // Return
  return options;
};
Manager.prototype.getArguments = Manager.getArguments;

// Report build errors with notification
Manager.reportBuildError = function (error, callback) {
  const logger = new (require('./lib/logger'))('build-error');

  // Send notification using notifly
  const errorMessage = error.message || error.toString() || 'Unknown error';
  const errorPlugin = error.plugin || 'Build';

  execute(`notifly --title 'Build Error: ${errorPlugin}' --message '${errorMessage.replace(/'/g, "\\'")}' --appIcon '/Users/ian/claude-ai-icon.png' --timeout 3 --sound 'Sosumi'`)
    .catch((e) => {
      logger.error('Failed to send notification', e);
    });

  // Log the error
  logger.error(`[${errorPlugin}] ${errorMessage}`);

  // If callback provided, call it with error
  if (callback) {
    return callback(error);
  }

  // Otherwise return a function that calls the callback with error
  return (cb) => cb ? cb(error) : error;
};
Manager.prototype.reportBuildError = Manager.reportBuildError;

// isBuildMode: checks if the build mode is enabled
Manager.isBuildMode = function () {
  return process.env.BXM_BUILD_MODE === 'true';
}
Manager.prototype.isBuildMode = Manager.isBuildMode;

// actLikeProduction - determines if we should act like production mode
Manager.actLikeProduction = function () {
  return Boolean(Manager.isBuildMode() || process.env.UJ_AUDIT_FORCE === 'true');
}
Manager.prototype.actLikeProduction = Manager.actLikeProduction;

// getEnvironment: returns the environment based on the build mode
Manager.getEnvironment = function () {
  return Manager.isBuildMode()
    ? 'production'
    : 'development';
}
Manager.prototype.getEnvironment = Manager.getEnvironment;

// getManifest: requires and parses config.yml
Manager.getManifest = function () {
  return JSON5.parse(jetpack.read('src/manifest.json') || '{}');
}
Manager.prototype.getManifest = Manager.getManifest;

// getConfig: requires and parses browser-extension-manager.json
Manager.getConfig = function () {
  return JSON5.parse(jetpack.read(path.join(process.cwd(), 'config', 'browser-extension-manager.json')));
}
Manager.prototype.getConfig = Manager.getConfig;

// getPackage: requires and parses package.json
Manager.getPackage = function (type) {
  const basePath = type === 'project'
    ? process.cwd()
    : path.resolve(__dirname, '..')

  const pkgPath = path.join(basePath, 'package.json')
  return JSON5.parse(jetpack.read(pkgPath))
}
Manager.prototype.getPackage = Manager.getPackage;

// getRootPath: returns the root path of the project or package
Manager.getRootPath = function (type) {
  return type === 'project'
    ? process.cwd()
    : path.resolve(__dirname, '..')
}
Manager.prototype.getRootPath = Manager.getRootPath;

// getLiveReloadPort: (35729)
Manager.getLiveReloadPort = function () {
  // Check if the port is set in the environment
  process.env.BXM_LIVERELOAD_PORT = process.env.BXM_LIVERELOAD_PORT || 35729;

  // Return the port
  return parseInt(process.env.BXM_LIVERELOAD_PORT);
}
Manager.prototype.getLiveReloadPort = Manager.getLiveReloadPort;

// Create dummy file in project dist to force jekyll to build
Manager.triggerRebuild = function (files, logger) {
  // Ensure logger is defined
  logger = this?._logger || logger || console;

  // Normalize files into an array of file names
  if (typeof files === 'string') {
    files = [files]; // Single string file name
  } else if (Array.isArray(files)) {
    // Already an array, no changes needed
  } else if (typeof files === 'object' && files !== null) {
    files = Object.keys(files); // Extract keys from object
  } else {
    logger.error('Invalid files for triggerRebuild()');
    return;
  }

  // Set current time
  const now = new Date();

  // Touch all files to update mtime (so Jekyll notices)
  files.forEach((file) => {
    try {
      fs.utimesSync(file, now, now);
      logger.log(`Triggered build: ${file}`);
    } catch (e) {
      logger.error(`Failed to trigger build ${file}`, e);
    }
  });
}
Manager.prototype.triggerRebuild = Manager.triggerRebuild;

// Require
Manager.require = function (path) {
  return require(path);
};
Manager.prototype.require = Manager.require;

// Memory monitoring utility
Manager.getMemoryUsage = function () {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
};
Manager.prototype.getMemoryUsage = Manager.getMemoryUsage;

Manager.logMemory = function (logger, label) {
  const mem = Manager.getMemoryUsage();
  logger.log(`[Memory ${label}] RSS: ${mem.rss}MB | Heap Used: ${mem.heapUsed}MB / ${mem.heapTotal}MB | External: ${mem.external}MB`);
};
Manager.prototype.logMemory = Manager.logMemory;

// Export
module.exports = Manager;
