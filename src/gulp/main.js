// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('main');
const argv = Manager.getArguments();
const { series, parallel, watch } = require('gulp');
const path = require('path');
const jetpack = require('fs-jetpack');

// Log
logger.log('Starting...', argv);

// Load tasks
const tasks = jetpack.list(path.join(__dirname, 'tasks'));

// Init global
global.tasks = {};
global.browserSync = null;

// Load tasks
tasks.forEach((file) => {
  const name = file.replace('.js', '');

  // Log
  logger.log('Loading task:', name);

  // Export task
  exports[name] = require(path.join(__dirname, 'tasks', file));
});

// Set global variable to access tasks in other files
global.tasks = exports;

// Define build process
exports.build = series(
  // exports.setup,
  // exports.clean,
  // exports.themes,
  exports.distribute,
  parallel(exports.sass, exports.webpack, exports.icons),
  exports.package,
);

// Compose task scheduler
exports.default = series(
  // exports.setup,
  // exports.clean,
  exports.serve,
  exports.build,
  exports.developmentRebuild,
  // exports.watcher,
);
