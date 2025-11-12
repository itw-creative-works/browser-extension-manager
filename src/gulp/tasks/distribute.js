// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('distribute');
const { src, dest, watch, series } = require('gulp');
const through2 = require('through2');
const path = require('path');
const createTemplateTransform = require('./utils/template-transform');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'src/**/*',

  // Files to exclude
  // Images handled by imagemin
  '!src/**/*.{jpg,jpeg,png,gif,svg,webp}',
  // JS files handled by webpack
  '!src/**/*.js',
  // CSS/SCSS files handled by sass task
  '!src/**/*.{css,scss,sass}',
  // Exlcude .DS_Store files
  '!**/.DS_Store',
  // Exclude any temp files
];
const output = 'dist';
const delay = 250;

// Index
let index = -1;

// Main task
function distribute() {
  return new Promise(async function(resolve, reject) {
    // Increment index
    index++;

    // Log
    logger.log('Starting...');

    // Complete
    return src(input, {
      base: 'src',
      dot: true,
      encoding: false
    })
      .pipe(customTransform())
      .pipe(createTemplateTransform({site: config}))
      .pipe(dest(output, { encoding: false }))
      .on('finish', () => {
        // Log
        logger.log('Finished!');

        // Complete
        return resolve();
      });
  });
}

function customTransform() {
  return through2.obj(function (file, _, callback) {
    // Skip if it's a directory
    if (file.isDirectory()) {
      return callback(null, file);
    }

    // Get relative path from src base
    const relativePath = path.relative(file.base, file.path).replace(/\\/g, '/');

    // Log
    logger.log(`Processing file: ${relativePath}`);

    // Change path if it starts with 'pages/'
    // if (relativePath.startsWith('pages/')) {
    //   // Remove 'pages/' prefix
    //   const newRelativePath = relativePath.replace(/^pages\//, '');

    //   // Update file path to remove pages directory
    //   // This will make src/pages/index.html -> dist/index.html
    //   file.path = path.join(file.base, newRelativePath);

    //   // Log
    //   logger.log(`  -> Moving from pages/ to root: ${newRelativePath}`);
    // }

    // Push the file
    this.push(file);

    // Continue
    callback();
  });
}

// Watcher task
function distributeWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay, dot: true }, distribute)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(
  // Manager.wrapTask('distribute', distribute),
  distribute,
  distributeWatcher
);
