// Libraries
const Manager = new (require('../build.js'));
const logger = Manager.logger('setup');
const argv = Manager.getArguments();
const path = require('path');
const jetpack = require('fs-jetpack');
const version = require('wonderful-version');
const { execute, template, force } = require('node-powertools');
const NPM = require('npm-api');
const glob = require('glob').globSync;
const { minimatch } = require('minimatch');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();

// Load config
const templating = {
  nodeVersion: version.major(package.engines.node),
};

// Dependency MAP
const DEPENDENCY_MAP = {
  'gulp': 'dev',
}

// File MAP
const FILE_MAP = {
  // Files to skip overwrite
  'hooks/**/*': {
    overwrite: false,
  },
  'src/**/*': {
    overwrite: false,
  },
  'src/**/*.{html,md}': {
    skip: (file) => {
      // Get the name
      const name = path.basename(file.name, path.extname(file.name));
      const htmlFilePath = path.join(file.destination, `${name}.html`);
      const mdFilePath = path.join(file.destination, `${name}.md`);
      const htmlFileExists = jetpack.exists(htmlFilePath);
      const mdFileExists = jetpack.exists(mdFilePath);
      const eitherExists = htmlFileExists || mdFileExists;

      // Skip if both files exist
      return eitherExists;
    },
  },

  // Files to rewrite path
  // Removed because getting too confusing
  // 'dist/pages/**/*': {
  //   path: (file) => file.source.replace('dist/pages', 'dist'),
  // },
  '_.gitignore': {
    name: (file) => file.name.replace('_.gitignore', '.gitignore'),
  },

  // Files to run templating on
  '.github/workflows/build.yml': {
    template: templating,
  },
  '.nvmrc': {
    template: templating,
  },
}

module.exports = async function (options) {
  // Fix options
  options = options || {};
  options.checkManager = force(options.checkManager || true, 'boolean');
  options.checkNode = force(options.checkNode || true, 'boolean');
  options.checkPeerDependencies = force(options.checkPeerDependencies || true, 'boolean');
  options.setupScripts = force(options.setupScripts || true, 'boolean');
  options.buildSiteFiles = force(options.buildSiteFiles || true, 'boolean');
  options.buildSiteFilesInput = force(options.buildSiteFilesInput || ['**/*'], 'array');
  options.checkLocality = force(options.checkLocality || true, 'boolean');

  // Log
  logger.log(`Welcome to ${package.name} v${package.version}!`);
  logger.log(`options`, options);

  // Prefix project
  project.dependencies = project.dependencies || {};
  project.devDependencies = project.devDependencies || {};

  try {
    // Log current working directory
    await logCWD();

    // Ensure this package is up-to-date
    if (options.checkManager) {
      await updateManager();
    }

    // Ensure proper node version
    if (options.checkNode) {
      await ensureNodeVersion();
    }

    // Run the setup
    if (options.checkPeerDependencies) {
      await ensurePeerDependencies();
    }

    // Setup scripts
    if (options.setupScripts) {
      await setupScripts();
    }

    // Build files
    if (options.buildSiteFiles) {
      await buildSiteFiles({ input: options.buildSiteFilesInput });
    }

    // Copy all files from src/defaults/dist on first run
    // await copyDefaultDistFiles();

    // Check which locality we are using
    if (options.checkLocality) {
      await checkLocality();
    }
  } catch (e) {
    // Throw error
    throw e;
  }
};

async function logCWD() {
  logger.log('Current working directory:', process.cwd());
  // logger.log('Current working directory 2:', await execute('pwd'));
  // logger.log('Current working directory 3:', await execute('ls -al'));
}

async function updateManager() {
  const npm = new NPM();

  // Get the latest version
  const installedVersion = project.devDependencies[package.name];
  const latestVersion = await npm.repo(package.name)
  .package()
    .then((pkg) => {
      return pkg.version;
    }, (e) => {
      return '0.0.0';
    });
  const isUpToDate = version.is(installedVersion, '>=', latestVersion);
  const levelDifference = version.levelDifference(installedVersion, latestVersion);

  // Log
  logVersionCheck(package.name, installedVersion, latestVersion, isUpToDate);

  // Quit if local
  if (installedVersion.startsWith('file:')) {
    return;
  }

  // Check if we need to update
  if (!isUpToDate) {
    // Quit if major version difference
    if (levelDifference === 'major') {
      return logger.error(`Major version difference detected. Please update to ${latestVersion} manually.`);
    }

    // Install the latest version
    await install(package.name, latestVersion);
  }
}

async function ensureNodeVersion() {
  const installedVersion = version.clean(process.version);
  const requiredVersion = version.clean(package.engines.node);
  const isUpToDate = version.is(installedVersion, '>=', requiredVersion);

  // Log
  logVersionCheck('Node.js', installedVersion, requiredVersion, isUpToDate);

  // Check if we need to update
  if (!isUpToDate) {
    throw new Error(`Node version is out-of-date. Required version is ${requiredVersion}.`);
  }
}
async function ensurePeerDependencies() {
  const requiredPeerDependencies = package.peerDependencies || {};

  // Loop through and make sure project has AT LEAST the required version
  for (let [dependency, ver] of Object.entries(requiredPeerDependencies)) {
    const projectDependencyVersion = version.clean(project.dependencies[dependency] || project.devDependencies[dependency]);
    const location = DEPENDENCY_MAP[dependency] === 'dev' ? '--save-dev' : '';
    const isUpToDate = version.is(projectDependencyVersion, '>=', ver);

    // Clean version if needed
    ver = version.clean(ver);

    // Log
    // logger.log('Checking peer dep:', dependency, '-->', projectDependencyVersion, '>=', ver);
    logVersionCheck(dependency, projectDependencyVersion, ver, isUpToDate);

    // Install if not found
    if (
      // Not found
      !projectDependencyVersion
      // Not the right version
      || !isUpToDate
    ) {
      await install(dependency, ver, location);
    }
  }
}

function setupScripts() {
  // Setup the scripts
  project.scripts = project.scripts || {};

  // Setup the scripts
  Object.keys(package.projectScripts).forEach((key) => {
    project.scripts[key] = package.projectScripts[key];
  });

  // Save the project
  jetpack.write(path.join(process.cwd(), 'package.json'), project);
}

function checkLocality() {
  const installedVersion = project.devDependencies[package.name];

  if (installedVersion.startsWith('file:')) {
    logger.warn(`⚠️⚠️⚠️ You are using the local version of ${package.name}. This WILL NOT WORK when published. ⚠️⚠️⚠️`);
  }
}

function install(package, ver, location) {
  // Default to latest
  ver || 'latest';

  // Clean version if needed
  ver = ver === 'latest' ? ver : version.clean(ver);

  // Build the command
  let command = `npm install ${package}@${ver} ${location || '--save'}`;

  // Log
  logger.log('Installing:', command);

  // Execute
  return execute(command, { log: true })
  .then(async () => {
    // Read new project
    const projectUpdated = jetpack.read(path.join(process.cwd(), 'package.json'), 'json');

    // Log
    logger.log('Installed:', package, ver);

    // Update package object
    project.dependencies = projectUpdated.dependencies;
    project.devDependencies = projectUpdated.devDependencies;
  });
}

function buildSiteFiles(options) {
  options = options || {};
  options.input = options.input || ['**/*'];

  // Loop through all files in /defaults directory
  const dir = path.join(__dirname, '..', 'defaults');
  const input = [
    // Files to include
    // '**/*',
    ...options.input,

    // Files to exclude
    // Dist files
    // '!dist/**',
    '!**/.DS_Store', // TODO: NOT WORKING
  ]

  // Get all files
  const files = glob(input, {
    cwd: dir,
    dot: true,
    nodir: true,
  });

  const debug = argv.debug
    || true;

  // Log
  logger.log(`Preparing to copy ${files.length} default files...`);

  // Loop
  for (const file of files) {
    // Build item
    const item = {
      source: null,
      destination: null,
      name: null,
    }
    // Get the destination
    // const source = path.join(dir, file);
    // let destination = path.join(process.cwd(), file.replace('defaults/', ''));
    // const filename = path.basename(destination);

    // Set the item properties
    item.source = path.dirname(path.join(dir, file));
    item.name = path.basename(file);
    item.destination = path.dirname(path.join(process.cwd(), file.replace('defaults/', '')));

    // Get options
    const options = getFileOptions(file);
    const ogName = item.name;

    // Quit if file is '_'
    // We have files like this to trigger the creation of directories without them being ignored by git
    if (item.name === '_') {
      // First, create the directory around the file
      jetpack.dir(item.destination);

      // Skip
      continue;
    }

    // Resolve name
    if (typeof options.name === 'function') {
      item.name = options.name(item);
    }

    // Resolve path
    if (typeof options.path === 'function') {
      item.destination = options.path(item);
    }

    // Resolve overwrite
    if (typeof options.overwrite === 'function') {
      options.overwrite = options.overwrite(item);
    }

    // Resolve skip
    if (typeof options.skip === 'function') {
      options.skip = options.skip(item);
    }

    // Log
    if (debug) {
      logger.log(`Copying defaults...`);
      logger.log(`  name: ${item.name}`);
      logger.log(`  from: ${item.source}`);
      logger.log(`  to: ${item.destination}`);
      logger.log(`  overwrite: ${options.overwrite}`);
      logger.log(`  skip: ${options.skip}`);

      // logger.log('File:', file);
      // logger.log('filename:', filename);
      // logger.log('options:', options);
      // // logger.log('contents:', jetpack.read(source));
      // logger.log('source:', source);
      // logger.log('Destination:', destination);
      console.log('\n');
    }

    // Skip if needed
    if (options.skip) {
      continue;
    }

    // Get final paths
    const finalSource = path.join(item.source, ogName);
    const finalDestination = path.join(item.destination, item.name);

    // console.log('---finalSource', finalSource);
    // console.log('---finalDestination', finalDestination);

    // Check if the file exists
    const exists = jetpack.exists(finalDestination);

    // Skip if exists and we don't want to overwrite
    if (!options.overwrite && exists) {
      continue;
    }

    // Run templating if needed
    if (options.template) {
      // Log
      // logger.log('Running templating on:', destination);

      // Run the templating
      const contents = jetpack.read(finalSource);
      const templated = template(contents, options.template);

      // Write the file
      jetpack.write(finalDestination, templated);
    } else {
      // Copy the file
      jetpack.copy(finalSource, finalDestination, { overwrite: true });
    }
  }
}

// Copy default dist files
// async function copyDefaultDistFiles() {
//   // Get the directory
//   const dir = path.join(__dirname, '..', '..', 'defaults', 'dist');

//   // Log
//   logger.log(`Copying default dist files from ${dir}`);

//   // Copy the files
//   jetpack.copy(dir, 'dist', { overwrite: true });
// }
// async function copyDefaultDistFiles() {
//   // Loop through all files in /defaults directory
//   const dir = path.join(__dirname, '..', '..', 'defaults', 'dist');
//   const input = [
//     // Files to include
//     '**/*',

//     // Files to exclude
//     '!**/.DS_Store', // TODO: NOT WORKING
//   ]

//   // Get all files
//   const files = glob(input, {
//     cwd: dir,
//     dot: true,
//     nodir: true,
//   });

//   // Log
//   logger.log(`Preparing to copy ${files.length} default dist files...`);

//   for (const file of files) {
//     // const relativePath = path.relative(path.join(__dirname, '..', '..', 'defaults', 'dist'), file);
//     // const destination = path.join(__dirname, '..', '..', 'dist', relativePath.replace('pages', ''));
//     const source = path.join(dir, file);
//     const destination = path.join(process.cwd(), file.replace('dist/pages', 'dist'));

//     // Log
//     if (true) {
//       logger.log(`Copying default dist file...`);
//       logger.log(`  file: ${file}`);
//       logger.log(`  from: ${source}`);
//       logger.log(`  to: ${destination}`);
//       console.log('\n');
//     }

//     // Ensure the directory exists
//     // await jetpack.dir(path.dirname(destination));

//     // Copy the file
//     // await jetpack.copy(file, destination, { overwrite: true });
//   }
// }

function getFileOptions(filePath) {
  const defaults = {
    overwrite: true,
    name: null,
    path: null,
    template: null,
    skip: false,
  };

  let options = { ...defaults };

  // Loop through all patterns
  for (const pattern in FILE_MAP) {
    if (minimatch(filePath, pattern)) {
      options = { ...options, ...FILE_MAP[pattern] };
    }
  }

  return options;
}

function logVersionCheck(name, installedVersion, latestVersion, isUpToDate) {
  // Quit if local
  if (installedVersion.startsWith('file:')) {
    isUpToDate = true;
  }

  // Log
  logger.log(`Checking if ${name} is up to date (${logger.format.bold(installedVersion)} >= ${logger.format.bold(latestVersion)}): ${isUpToDate ? logger.format.green('Yes') : logger.format.red('No')}`);
}
