// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('XXX');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Task
module.exports = function XXX(complete) {
  // Log
  logger.log('Starting XXX...');

  // Complete
  return complete();
}
