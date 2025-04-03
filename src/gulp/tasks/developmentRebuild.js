// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('development-rebuild');
const { src, dest, watch, series } = require('gulp');
const path = require('path');
const { execute } = require('node-powertools');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  `${rootPathPackage}/dist/defaults/dist/**/*`,

  // Files to exclude
];
const output = 'dist';
const delay = 250;

// Index
let index = -1;

// SASS Compilation Task
async function developmentRebuild(complete) {
  // Increment index
  index++;

  // Log
  logger.log('Starting...');

  // Skip first run
  if (index === 0 && false) {
    logger.log('Skipping first run');
    return complete();
  }

  // Execute uj setup again
  const checks = [
    '--check-manager=false',
    '--check-node=false',
    '--check-peer-dependencies=false',
    '--setup-scripts=false',
    '--build-site-files=true',
    '--build-site-files-input="dist/**/*"',
    '--check-locality=false',
  ];

  // Execute
  await execute(`npx bxm setup ${checks.join(' ')}`, { log: true });

  // Log
  logger.log('Finished!');

  // Complete
  return complete();

  // Compile
  // return src(input)
  //   .pipe(dest(output))
  //   .on('end', () => {
  //     // Log
  //     logger.log('Finished!');

  //     // Complete
  //     return complete();
  //   });
}

// Watcher Task
function developmentRebuildWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay }, developmentRebuild)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(developmentRebuild, developmentRebuildWatcher);
