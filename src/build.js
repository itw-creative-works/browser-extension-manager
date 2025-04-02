// Libraries
const path = require('path');
const jetpack = require('fs-jetpack');
const JSON5 = require('json5');
const argv = require('yargs').argv;
const { force } = require('node-powertools');

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
  // Create logger
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
  options.browser = force(options.browser === undefined ? true : options.browser, 'boolean');
  options.debug = force(options.debug === undefined ? false : options.debug, 'boolean');

  // Return
  return options;
};
Manager.prototype.getArguments = Manager.getArguments;

// isBuildMode: checks if the build mode is enabled
Manager.isBuildMode = function () {
  return process.env.BXM_BUILD_MODE === 'true';
}
Manager.prototype.isBuildMode = Manager.isBuildMode;

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

// getConfig: requires and parses config.json
Manager.getConfig = function () {
  return JSON5.parse(jetpack.read(path.join(process.cwd(), 'config.json')));
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

// Require
Manager.require = function (path) {
  return require(path);
};
Manager.prototype.require = Manager.require;

// Export
module.exports = Manager;
