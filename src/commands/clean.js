// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('clean');
const { execSync } = require('child_process');
const jetpack = require('fs-jetpack');
const path = require('path');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

// Dirs to clean
const dirs = [
  '.temp',
  'dist',
  'packaged',
  // 'src/assets/themes',
]

// Dirs to preserve inside cleaned dirs
const preserve = [
  'packaged/translations',
]

module.exports = async function (options) {
  // Log
  logger.log(`Cleaning up .temp, dist, and packaged directories...`);

  try {
    // Back up preserved dirs
    const backups = {};
    for (const dir of preserve) {
      if (!jetpack.exists(dir)) {
        continue;
      }

      const backupPath = path.join('.temp', '_preserve', dir);
      jetpack.dir(path.dirname(backupPath));
      jetpack.move(dir, backupPath, { overwrite: true });
      backups[dir] = backupPath;
    }

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

    // Restore preserved dirs
    for (const [dir, backupPath] of Object.entries(backups)) {
      jetpack.dir(path.dirname(dir));
      jetpack.move(backupPath, dir, { overwrite: true });
      logger.log(`Preserved: ${dir}`);
    }

    // Clean up temp preserve dir
    jetpack.remove(path.join('.temp', '_preserve'));
  } catch (e) {
    logger.error(`Error clearing directories: ${e}`);
  }
};
