// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('main');
const argv = Manager.getArguments();
const { series, parallel } = require('gulp');
const path = require('path');
const glob = require('glob').globSync;

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

// Log
logger.log('Starting...', argv);

// Load tasks
const tasks = glob('*.js', { cwd: `${__dirname}/tasks` });

// Init global
global.tasks = {};
global.websocket = null;

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
  exports.defaults,
  exports.translate,
  exports.distribute,
  parallel(exports.sass, exports.webpack, exports.icons, exports.html),
  exports.package,
  exports.audit,
);

// Compose task scheduler
exports.default = series(
  // exports.setup,
  // exports.clean,
  exports.serve,
  exports.build,
  // exports.developmentRebuild,
  // exports.watcher,
);
