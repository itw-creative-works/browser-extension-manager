// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('defaults');
const { src, dest, watch, series } = require('gulp');
const through2 = require('through2');
const jetpack = require('fs-jetpack');
const path = require('path');
const { minimatch } = require('minimatch');
const { template } = require('node-powertools');
const createTemplateTransform = require('./utils/template-transform');
const argv = require('yargs').argv;
const JSON5 = require('json5');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Get clean versions
// const cleanVersions = { versions: Manager.getCleanVersions()};
const cleanVersions = { versions: package.engines };

// File MAP
const FILE_MAP = {
  // Files to skip overwrite
  '**/*.md': {
    overwrite: false,
  },
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

  // Config file with smart merging
  'config/browser-extension-manager.json': {
    overwrite: true,
    merge: true,
  },

  // Files to run templating on
  '.nvmrc': {
    template: cleanVersions,
  },

  // Files to skip
  '**/.DS_Store': {
    skip: true,
  },
  '**/__temp/**/*': {
    skip: true,
  },
}

// Glob
const input = [
  // Files to include
  `${rootPathPackage}/dist/defaults/**/*`,
];
const output = './';
const delay = 250;

// Index
let index = -1;

// Helper function to merge configs intelligently
function mergeConfigs(existingConfig, newConfig) {
  const merged = { ...newConfig };

  // Recursively merge nested objects
  function mergeNested(target, source, newDefaults) {
    for (const key in newDefaults) {
      if (Object.prototype.hasOwnProperty.call(newDefaults, key)) {
        const newValue = newDefaults[key];
        const existingValue = source[key];

        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          // Handle nested objects
          target[key] = target[key] || {};
          mergeNested(target[key], existingValue || {}, newValue);
        } else if (Object.prototype.hasOwnProperty.call(source, key) && existingValue !== 'default') {
          // User has a custom value, keep it
          target[key] = existingValue;
        } else {
          // User doesn't have this option or has 'default', use new default
          target[key] = newValue;
        }
      }
    }
  }

  mergeNested(merged, existingConfig, newConfig);

  return merged;
}

// Main task
function defaults(complete, changedFile) {
  // Increment index
  index++;

  // Log
  logger.log('Starting...');

  // Use changedFile if provided, otherwise use all inputs
  const filesToProcess = changedFile ? [changedFile] : input;
  logger.log('input', filesToProcess)

  // Log files being used
  logger.log('Files being used:');

  // Complete
  // return src(input, { base: 'src' })
  return src(filesToProcess, { base: `${rootPathPackage}/dist/defaults`, dot: true, encoding: false })  // Add base to preserve directory structure
    .pipe(customTransform())
    .pipe(createTemplateTransform({site: config}))
    .pipe(dest(output, { encoding: false }))
    .on('finish', () => {
      // Log
      logger.log('Finished!');

      // Complete
      return complete();
    });
}

function customTransform() {
  return through2.obj(function (file, _, callback) {
    // Skip if it's a directory
    if (file.isDirectory()) {
      return callback(null, file);
    }

    // If the file is named .gitkeep, create the directory but don't copy the file
    if (path.basename(file.path) === '.gitkeep') {
      jetpack.dir(path.dirname(path.join(output, path.relative(file.base, file.path))));
      return callback();
    }

    // Get relative path
    const relativePath = path.relative(file.base, file.path).replace(/\\/g, '/');

    // Check if this is a binary file BEFORE any processing
    const isBinaryFile = /\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|otf|eot|pdf|zip|tar|gz|mp3|mp4|avi|mov)$/i.test(file.path);

    // Build item
    const item = {
      source: path.dirname(file.path),
      name: path.basename(file.path),
      destination: path.dirname(relativePath),
    };

    const options = getFileOptions(relativePath);
    const ogName = item.name;

    // Handle dynamic rename
    if (typeof options.name === 'function') {
      item.name = options.name(item);
    }

    // Handle dynamic path
    if (typeof options.path === 'function') {
      item.destination = options.path(item);
    }

    // Handle overwrite/skip as functions
    if (typeof options.overwrite === 'function') {
      options.overwrite = options.overwrite(item);
    }
    if (typeof options.skip === 'function') {
      options.skip = options.skip(item);
    }

    // Final relative path
    const finalRelativePath = path.join(item.destination, item.name);
    const fullOutputPath = path.join(output, finalRelativePath);

    // Check existence
    const exists = jetpack.exists(fullOutputPath);

    // Handle config merging
    if (options.merge && exists && !isBinaryFile) {
      try {
        const existingContent = jetpack.read(fullOutputPath);
        const newContent = file.contents.toString();

        const existingConfig = JSON5.parse(existingContent);
        const newConfig = JSON5.parse(newContent);

        // Merge configs, preserving user's non-default values
        const mergedConfig = mergeConfigs(existingConfig, newConfig);

        // Update file contents with merged config
        file.contents = Buffer.from(JSON5.stringify(mergedConfig, null, 2));

        logger.log(`Merged config file: ${relativePath}`);
      } catch (error) {
        logger.error(`Error merging config file ${relativePath}:`, error);
        // Fall through to normal processing if merge fails
      }
    }

    // Skip if instructed
    if (options.skip || (!options.overwrite && exists && !options.merge)) {
      logger.log(`Skipping file: ${relativePath}`);
      return callback();
    }

    // Log
    // logger.log(`Processing file: ${relativePath}`);
    // logger.log(`  _ORIG: ${file.path}`);
    // logger.log(`  name: ${item.name}`);
    // logger.log(`  destination: ${item.destination}`);
    // logger.log(`  overwrite: ${options.overwrite}`);
    // logger.log(`  skip: ${options.skip}`);
    // logger.log(`  _FINAL: ${fullOutputPath}`);

    // Run template if required
    if (options.template && !isBinaryFile) {
      const contents = file.contents.toString();
      const templated = template(contents, options.template);

      // Update file contents
      file.contents = Buffer.from(templated);
    }

    // Update path
    file.path = path.join(file.base, finalRelativePath);

    // Push transformed file
    this.push(file);

    // Complete
    return callback();
  });
}
function defaultsWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay, dot: true })
  .on('change', (changedPath) => {
    logger.log(`[watcher] File changed (${changedPath})`);
    // Call defaults with just the changed file
    defaults(() => {}, changedPath);
  });

  // Complete
  return complete();
}

// Default Task
module.exports = series(defaults, defaultsWatcher);

function getFileOptions(filePath) {
  const defaults = {
    overwrite: true,
    name: null,
    path: null,
    template: null,
    skip: false,
    rule: null,
  };

  let options = { ...defaults };

  for (const pattern in FILE_MAP) {
    if (minimatch(filePath, pattern)) {
      options = { ...options, ...FILE_MAP[pattern] };
      options.rule = pattern;
    }
  }

  return options;
}
