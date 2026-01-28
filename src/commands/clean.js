// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('clean');
const { execSync } = require('child_process');
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
      // Remove (use rm -rf on Unix for speed, fallback to jetpack on Windows)
      if (process.platform !== 'win32') {
        execSync(`rm -rf ${dir}`, { stdio: 'ignore' });
      } else {
        jetpack.remove(dir);
      }

      // Create empty dir
      jetpack.dir(dir);
    });
  } catch (e) {
    logger.error(`Error clearing directories: ${e}`);
  }
};
