// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('sass');
const { src, dest, watch, series } = require('gulp');
const glob = require('glob').globSync;
const path = require('path');
const jetpack = require('fs-jetpack');
const compiler = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const filter = require('gulp-filter').default;

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Define bundle files separately for easier tracking
const bundleFiles = [
  // Main bundles (if any exist in bundles/ directory)
  `${rootPathPackage}/dist/assets/css/bundles/*.scss`,

  // Project bundles
  'src/assets/css/bundles/*.scss',
];

// Glob
const input = [
  // Bundle files (if any exist)
  ...bundleFiles,

  // Project entry point (main.scss)
  'src/assets/css/main.scss',

  // Component-specific CSS
  `${rootPathPackage}/dist/assets/css/components/**/*.scss`,
  'src/assets/css/components/**/*.scss',
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

// Configuration
const MAIN_BUNDLE_COMPONENT_PARTIALS = false; // Set to true to merge components into _component-specific.scss, false to compile separately

// SASS Compilation Task
function sass(complete) {
  // Log
  logger.log('Starting...');
  Manager.logMemory(logger, 'Start');

  // Generate component-specific scss
  generateComponentScss();

  // Compile
  let stream = src(input, { sourcemaps: true })
    // Skip files based on configuration
    .pipe(filter(file => !shouldSkip(file.path), { restore: true }))
    // Compile SASS
    .pipe(compiler({
      loadPaths: [
        // So we can use "@use 'browser-extension-manager' as *;"
        path.resolve(rootPathPackage, 'dist/assets/css'),

        // So we can use "@use 'theme' as *;" which resolves to the active theme
        path.resolve(rootPathPackage, 'dist/assets/themes', config.theme?.id || 'classy'),

        // So we can load _component-specific.scss from the project's dist
        path.resolve(rootPathProject, 'dist/assets/css'),

        // Allow importing from node_modules (e.g., @import '@fortawesome/fontawesome-free/css/all.min.css')
        path.resolve(rootPathProject, 'node_modules'),
      ],
      // Suppress deprecation warnings
      quietDeps: true,
      // Only show warnings once
      verbose: false
    })
    .on('error', (error) => Manager.reportBuildError(Object.assign(error, { plugin: 'SASS' }), complete)));

  // Process
  return stream
    .pipe(cleanCSS({
      format: Manager.actLikeProduction() ? 'compressed' : 'beautify',
    }))
    .pipe(rename((file) => {
      // Get list of expected bundle names from the bundle files glob
      // These are files that should be in the root CSS directory
      let bundleFilesFound = [];
      try {
        bundleFilesFound = glob(bundleFiles);
      } catch (e) {
        // Directory doesn't exist, that's ok
      }
      const bundleNames = bundleFilesFound.map(f => path.basename(f, '.scss'));
      bundleNames.push('main'); // main.scss is always a root bundle

      // Check if this is a root-level bundle
      const baseName = file.basename;
      const isBundle = bundleNames.includes(baseName);

      // Check
      if (isBundle) {
        // Root-level bundles (main, or any future bundle in bundles/ directory)
        // Keep in root directory
        file.dirname = '.';
      } else {
        // Component files: special handling for pages vs other components
        //
        // ⚠️ CRITICAL: The 'pages' directory is treated differently!
        //
        // Pages directory can have MULTIPLE files (index, pricing, login, etc.)
        // - pages/index.scss     → components/pages/index.bundle.css ✓
        // - pages/pricing.scss   → components/pages/pricing.bundle.css ✓
        // - pages/login.scss     → components/pages/login.bundle.css ✓
        //
        // Other components only have ONE file (index.html), so we strip /index:
        // - popup/index.scss     → components/popup.bundle.css ✓
        // - options/index.scss   → components/options.bundle.css ✓
        // - sidepanel/index.scss → components/sidepanel.bundle.css ✓
        //
        // ❌ DO NOT GENERATE: components/pages.bundle.css
        // ✓ DO GENERATE: components/pages/index.bundle.css, components/pages/pricing.bundle.css, etc.

        const isInPages = file.dirname.includes(path.sep + 'pages' + path.sep)
          || file.dirname.endsWith(path.sep + 'pages')
          || file.dirname === 'pages';

        if (file.basename === 'index' && !isInPages) {
          // For non-pages components: strip /index
          // components/popup/index.scss -> components/popup.bundle.css
          const parts = file.dirname.split(path.sep);
          const parentDir = parts[parts.length - 1];
          file.basename = parentDir;
          parts.pop();
          file.dirname = parts.join(path.sep);
        }
        // For pages or non-index files: keep full path
        // components/pages/index.scss -> components/pages/index.bundle.css
        // components/pages/pricing.scss -> components/pages/pricing.bundle.css

        // Add components/ prefix if not already there
        if (!file.dirname.startsWith('components/') && !file.dirname.startsWith('components\\')) {
          file.dirname = `components/${file.dirname}`;
        }
      }

      // Add bundle to the name
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
  watch(watchInput, { delay: delay, dot: true }, sass)
  .on('change', (path) => {
    logger.log(`[watcher] File changed (${path})`);
  });

  // Complete
  return complete();
}

function generateComponentScss() {
  // Only generate _component-specific.scss if we're skipping component partials
  if (!MAIN_BUNDLE_COMPONENT_PARTIALS) {
    // When compiling components separately, create an empty file with a comment
    const outputPath = path.resolve(rootPathProject, 'dist/assets/css/_component-specific.scss');
    const content = `/*
  AUTO-GENERATED COMPONENT-SPECIFIC SCSS
  Components are now compiled separately when MAIN_BUNDLE_COMPONENT_PARTIALS = false
  Find compiled component CSS in dist/assets/css/components/
*/

`;

    jetpack.write(outputPath, content);
    Manager.triggerRebuild(outputPath);
    return;
  }

  // TODO: Implement merged component partials if needed in the future
  // This would be similar to UJ's page-specific merging
  logger.log('Merged component partials not yet implemented');
}

function isComponentPartial(file) {
  return file.includes('/assets/css/components/') && file.endsWith('index.scss');
}

function shouldSkip(file) {
  // Skip component partials only if MAIN_BUNDLE_COMPONENT_PARTIALS is true
  if (MAIN_BUNDLE_COMPONENT_PARTIALS && isComponentPartial(file)) {
    return true;
  }
  return false;
}

// Default Task
// Export
module.exports = series(
  sass,
  sassWatcher
);
