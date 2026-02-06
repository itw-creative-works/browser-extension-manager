// Libraries
const Manager = new (require('browser-extension-manager/build'));
const logger = Manager.logger('build:pre');

// Hook
module.exports = async (index) => {
  logger.log('Running with index =', index);
}
