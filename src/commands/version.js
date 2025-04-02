// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('version');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

module.exports = async function (options) {
  // Log
  logger.log(package.version);
};
