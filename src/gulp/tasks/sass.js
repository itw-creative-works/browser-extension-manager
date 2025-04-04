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
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'src/assets/css/**/*.{css,scss,sass}',

  // Main files
  `${rootPathPackage}/dist/assets/css/**/*`,

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
    // .pipe(
    //   compiler({
    //     outputStyle: 'compressed',
    //     // importer: alias.create({
    //     //   // '@themes': path.resolve(rootPathProject, `node_modules/${package.name}/dist/assets`),
    //     //   '@themes': '/node_modules/browser-extension-manager/dist/assets/themes',
    //     // }),
    //     // importers: [customAliasImporter],
    //     // includePaths: [
    //     //   // path.resolve(rootPathProject, `node_modules/${package.name}/dist/assets`),
    //     //   '/Users/ian/Developer/Repositories/Slinko/slinko-browser-extension/node_modules/browser-extension-manager/dist/assets',
    //     // ]
    //     // includePaths: [
    //     //   path.join(__dirname, '..', '..', 'src'),
    //     //   path.resolve(__dirname, '../../src/assets'),
    //     //   path.resolve(__dirname, '../../src'),
    //     // ],
    //     // includePaths: [
    //     //   path.resolve(__dirname, '../../'),
    //     //   path.resolve(process.cwd(), '../../'),
    //     // ],
    //     // loadPaths: [
    //     //   path.resolve(rootPathProject, `node_modules/${package.name}/dist/assets`),
    //     // ],
    //   }).on('error', compiler.logError)
    // )
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
