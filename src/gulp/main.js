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
const projectRoot = Manager.getRootPath('project');

// Load .env file from project root
require('dotenv').config({ path: path.join(projectRoot, '.env') });

// Tee all stdout/stderr to <projectRoot>/logs/<dev|build>.log for easy `tail -f` / grep / Claude
// inspection — captures gulp task output, webpack/serve output, console.log calls, the works.
// build.log for production builds (BXM_BUILD_MODE=true), dev.log for `npm start`.
// Disable via BXM_LOG_FILE=false. Override path via BXM_LOG_FILE=<path>.
const attachLogFile = require('../utils/attach-log-file.js');
const logFileEnv = process.env.BXM_LOG_FILE;
if (logFileEnv !== 'false' && logFileEnv !== '0') {
  const defaultName = Manager.isBuildMode() ? 'build.log' : 'dev.log';
  const logPath = (logFileEnv && logFileEnv !== 'true') ? logFileEnv : path.join(projectRoot, 'logs', defaultName);
  attachLogFile(logPath);
  logger.log(`Logs tee'd to ${logPath}`);
}

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
  exports.distribute,
  exports.translate,
  parallel(exports.sass, exports.webpack, exports.icons, exports.html),
  exports.package,
  exports.audit,
  exports.publish,
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
