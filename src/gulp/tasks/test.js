// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('test');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Task
module.exports = function test(complete) {
  // Log
  logger.log('Starting test...');

  // Complete
  return complete();
}
