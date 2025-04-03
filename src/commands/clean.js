// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('clean');
const jetpack = require('fs-jetpack');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

// Const dirs
const dirs = [
  '.temp',
  'dist',
  'packaged',
  // 'src/assets/themes',
]

module.exports = async function (options) {
  // Log
  logger.log(`Cleaning up .temp, dist, and packaged directories...`);

  try {
    // Loop through dirs
    dirs.forEach((dir) => {
      // Remove
      jetpack.remove(dir);

      // Create empty dir
      jetpack.dir(dir);
    });
  } catch (e) {
    logger.error(`Error clearing directories: ${e}`);
  }
};
