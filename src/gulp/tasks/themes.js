// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('themes');
const { src, dest, watch, series } = require('gulp');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  `${rootPathPackage}/dist/assets/themes/**/*`,

  // Files to exclude
  // '!dist/**',
];
const output = 'src/assets/themes';
const delay = 250;

// Index
let index = -1;

// Main task
function themes(complete) {
  // Increment index
  index++;

  // Log
  logger.log('Starting...');

  // Complete
  return src(input)
    .pipe(dest(output))
    .on('end', () => {
      // Log
      logger.log('Finished!');

      // Complete
      return complete();
    });
}

// Watcher task
function themesWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay }, themes)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(themes, themesWatcher);


