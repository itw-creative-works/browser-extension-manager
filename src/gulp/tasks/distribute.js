// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('distribute');
const { src, dest, watch, series } = require('gulp');
const through2 = require('through2');
const jetpack = require('fs-jetpack');
const path = require('path');
const { execute } = require('node-powertools');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'src/**/*',

  // Files to exclude
  // '!dist/**',
];
const output = 'dist';
const delay = 250;

// Index
let index = -1;

// Main task
async function distribute(complete) {
  // Increment index
  index++;

  // Log
  logger.log('Starting...');

  // Create build JSON
  await createBuildJSON();

  // Complete
  return src(input, { base: 'src' })
    // .pipe(customPathTransform())
    .pipe(dest(output))
    .on('end', () => {
      // Log
      logger.log('Finished!');

      // Complete
      return complete();
    });
}

function customPathTransform() {
  return through2.obj(function (file, _, callback) {
    // Skip if it's a directory
    if (file.isDirectory()) {
      return callback(null, file);
    }

    // Get relative path
    const relativePath = path.relative(file.base, file.path);

    // Log
    // logger.log(`Processing file 111: ${relativePath}`);

    // Change path if it starts with 'pages/'
    if (relativePath.startsWith('pages/')) {
      const newRelativePath = relativePath.replace(/^pages\//, '');
      file.path = path.join(file.base, newRelativePath);

      // Log
      // logger.log(`Changed path to 222: ${file.path}`);
    }

    // Log
    // logger.log(`Processing file 333: ${file.path}`);

    // Push the file
    this.push(file);

    // Continue
    callback(null, file);
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
  watch(input, { delay: delay }, distribute)
  .on('change', function(path) {
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(distribute, distributeWatcher);


// Get git info
async function getGitInfo() {
  return await execute('git remote -v')
  .then((r) => {
    // Split on whitespace
    const split = r.split(/\s+/);
    const url = split[1];

    // Get user and repo
    const user = url.split('/')[3];
    const name = url.split('/')[4].replace('.git', '');

    // Return
    return {user, name};
  })
}

// Create build.json
async function createBuildJSON() {
  // Create build log JSON
  try {
    // Get info first
    const git = await getGitInfo();

    // Create JSON
    const json = {
      timestamp: new Date().toISOString(),
      repo: {
        user: git.user,
        name: git.name,
      },
      environment: Manager.getEnvironment(),
      packages: {
        'web-manager': require('web-manager/package.json').version,
        [package.name]: package.version,
      },
      manifest: manifest,
    }

    // Log object
    // logger.log('Build JSON:', json);

    // Write to file
    jetpack.write('dist/build.json', JSON.stringify(json, null, 2));

    // Log
    logger.log('Created build.json');
  } catch (e) {
    console.error('Error updating build.json', e);
  }
}


