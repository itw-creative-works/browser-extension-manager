// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('icons');
const { src, dest, watch, series } = require('gulp');
const glob = require('glob').globSync;
const responsive = require('gulp-responsive-modern');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');

// Glob
const input = [
  // Files to include
  // 'src/assets/images/**/*.{jpg,jpeg,png}',
  // 'src/assets/images/icons/**/*.{jpg,jpeg,png}',
  'src/assets/images/icons/icon.png',

  // Files to exclude
  // '!dist/**',
];
const output = 'dist/assets/images/icons';
const delay = 250;

// Main task
function icons(complete) {
  // Log
  logger.log('Starting...');

  // Use glob to get file count for matching files
  const files = glob(input);

  // If there's no files, complete
  if (files.length === 0) {
    // Log
    logger.log('Found 0 images to process');

    // Complete
    return complete();
  }

  // Log
  logger.log(`Found ${files.length} images to process`, files);

  // Filter out files that already exist in the destination
  // const filesToProcess = files.filter(file => {
  //   const fileName = path.basename(file);
  //   const destFile = path.join(output, fileName);
  //   return !jetpack.exists(destFile);
  // });

  // If there's no files to process, complete
  // if (filesToProcess.length === 0) {
  //   // Log
  //   logger.log('No new images to process');

  //   // Complete
  //   return complete();
  // }

  // Log
  // logger.log(`Processing ${filesToProcess.length} images`, filesToProcess);

  // Process images: resize and convert to webp
  return src(files)
    .pipe(
      responsive({
        '**/*.{jpg,jpeg,png}': [
          // 1024 resized version in original format
          {
            width: 1024,
            rename: { suffix: '-1024x' }
          },
          // 512 resized version in original format
          {
            width: 512,
            rename: { suffix: '-512x' }
          },
          // 256 resized version in original format
          {
            width: 256,
            rename: { suffix: '-256x' }
          },
          // 128 resized version in original format
          {
            width: 128,
            rename: { suffix: '-128x' }
          },
          // 48 resized version in original format
          {
            width: 48,
            rename: { suffix: '-48x' }
          },
          // 32 resized version in original format
          {
            width: 32,
            rename: { suffix: '-32x' }
          },
          // 16 resized version in original format
          {
            width: 16,
            rename: { suffix: '-16x' }
          },
          // Original size in original format
          {
            rename: { suffix: '' }
          }
        ]
      }, {
        quality: 100,
        progressive: true,
        withMetadata: false,
        withoutEnlargement: false,
        skipOnEnlargement: false,
      })
    )
    .pipe(dest(output))
    .on('end', () => {
      // Log
      logger.log('Finished!');

      // Complete
      return complete();
    });
}

// Watcher task
function iconsWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay }, icons)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(icons, iconsWatcher);
