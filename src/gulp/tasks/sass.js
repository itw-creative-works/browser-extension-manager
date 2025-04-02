// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('sass');
const { src, dest, watch, series } = require('gulp');
const path = require('path');
const compiler = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

// Glob
const input = [
  // Files to include
  'src/assets/css/**/*.{css,scss,sass}',

  // Main files
  // `${__dirname}/../../assets/css/main.scss`,
  // path.join(__dirname, '..', '..', 'assets/css/main.scss'),
  `${path.join(__dirname, '..', '..', 'assets/css')}/**/*`

  // Files to exclude
  // '!dist/**',
];
const output = 'dist/assets/css';
const delay = 250;

// SASS Compilation Task
function sass(complete) {
  // Log
  logger.log('Starting...');

  // Compile
  return src(input)
    .pipe(compiler({ outputStyle: 'compressed' }).on('error', compiler.logError))
    .pipe(cleanCSS())
    .pipe(rename((path) => {
      path.basename += '.bundle';
    }))
    .pipe(dest(output))
    .on('end', () => {
      // Log
      logger.log('Finished!');

      // Complete
      return complete();
    });
}

// Watcher Task
function sassWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay }, sass)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(sass, sassWatcher);
