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
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'src/assets/css/main.scss',

  // Main files
  `${rootPathPackage}/dist/assets/css/**/*`,

  // Files to exclude
  // '!dist/**',
];
// Additional files to watch (but not compile as entry points)
const watchInput = [
  // Watch the paths we're compiling
  ...input,

  // Core CSS - watch for changes but don't compile as entry points
  `${rootPathPackage}/dist/assets/css/**/*.scss`,

  // Theme CSS - watch for changes but don't compile as entry points
  `${rootPathPackage}/dist/assets/themes/**/*.scss`,
  'src/assets/themes/**/*.scss',
];

const output = 'dist/assets/css';
const delay = 250;
const compiled = {};

// SASS Compilation Task
function sass(complete) {
  // Log
  logger.log('Starting...');

  // Compile
  return src(input, { sourcemaps: true })
    .pipe(compiler({
      loadPaths: [
        // So we can use "@use 'ultimate-jekyll-manager' as *;"
        path.resolve(rootPathPackage, 'dist/assets/css'),

        // So we can use "@use 'themes/{theme}' as *;" in the project
        // path.resolve(rootPathPackage, 'dist/assets/themes', config.theme.id),

        // So we can load _pages.scss from the project's dist
        path.resolve(rootPathProject, 'dist/assets/css'),

        // TODO: Add more load paths like node_modules for things like fontawesome
        // path.resolve(rootPathProject, 'node_modules'),
      ],
      // Suppress deprecation warnings from Bootstrap
      quietDeps: true,
      // Only show warnings once
      verbose: false
    })
    .on('error', (error) => Manager.reportBuildError(Object.assign(error, { plugin: 'SASS' }), complete)))
    .pipe(cleanCSS({
      format: Manager.actLikeProduction() ? 'compressed' : 'beautify',
    }))
    .pipe(rename((file) => {
      file.basename += '.bundle';

      // Track the full output path
      const fullPath = path.resolve(output, file.dirname, `${file.basename}${file.extname}`);
      compiled[fullPath] = true;
    }))
    .pipe(dest(output, { sourcemaps: '.' }))
    .on('finish', () => {
      // Log
      logger.log('Finished!');

      // Trigger rebuild
      Manager.triggerRebuild(compiled);

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
  watch(input, { delay: delay, dot: true }, sass)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(sass, sassWatcher);
