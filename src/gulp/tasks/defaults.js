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
const argv = require('yargs')(process.argv.slice(2)).parseSync();
const JSON5 = require('json5');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Constants
const LOUD = process.env.BXM_LOUD_LOGS === 'true';

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
    mergeLines: true,
  },
  '_.env': {
    name: (file) => file.name.replace('_.env', '.env'),
    mergeLines: true,
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

// Helper function to merge line-based files (.gitignore, .env)
function mergeLineBasedFiles(existingContent, newContent, fileName) {
  // Parse existing content into lines
  const existingLines = existingContent.split('\n');
  const newLines = newContent.split('\n');

  // For .env files, we track keys; for .gitignore, we track the full line
  const isEnvFile = fileName === '.env';

  // Markers for separating default values from user custom values
  const DEFAULT_SECTION_MARKER = '# ========== Default Values ==========';
  const CUSTOM_SECTION_MARKER = '# ========== Custom Values ==========';

  // Parse existing file into default section and custom section
  let defaultSection = [];
  let customSection = [];
  let inCustomSection = false;
  let inDefaultSection = false;

  const existingDefaultKeys = new Set();
  const existingCustomKeys = new Set();

  for (const line of existingLines) {
    const trimmed = line.trim();

    // Check for section markers
    if (trimmed === DEFAULT_SECTION_MARKER) {
      inDefaultSection = true;
      inCustomSection = false;
      continue;
    }
    if (trimmed === CUSTOM_SECTION_MARKER) {
      inCustomSection = true;
      inDefaultSection = false;
      continue;
    }

    // Add to appropriate section
    if (inCustomSection) {
      customSection.push(line);
      // Track custom keys
      if (isEnvFile && trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0].trim();
        if (key) {
          existingCustomKeys.add(key);
        }
      }
    } else if (inDefaultSection) {
      defaultSection.push(line);
      // Track default keys
      if (isEnvFile && trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0].trim();
        if (key) {
          existingDefaultKeys.add(key);
        }
      }
    }
  }

  // Parse new content to build complete default section in order
  const newDefaultSection = [];
  const newDefaultKeys = new Set();

  let inNewDefaultSection = false;
  let inNewCustomSection = false;

  for (const line of newLines) {
    const trimmed = line.trim();

    // Check for section markers
    if (trimmed === DEFAULT_SECTION_MARKER) {
      inNewDefaultSection = true;
      inNewCustomSection = false;
      continue;
    }
    if (trimmed === CUSTOM_SECTION_MARKER) {
      inNewCustomSection = true;
      inNewDefaultSection = false;
      continue;
    }

    // Only process default section from new file
    if (inNewDefaultSection) {
      // For env files, check if key exists
      if (isEnvFile && trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0].trim();
        if (key) {
          newDefaultKeys.add(key);
          // If key exists in user's file (either section), skip the default value
          if (!existingDefaultKeys.has(key) && !existingCustomKeys.has(key)) {
            // New key - add it
            newDefaultSection.push(line);
          } else {
            // Key exists - we'll add user's value later in order
            newDefaultSection.push(null); // Placeholder to maintain order
          }
        } else {
          newDefaultSection.push(line);
        }
      } else {
        // Comments and empty lines
        newDefaultSection.push(line);
      }
    }
  }

  // Now merge user's existing default values in the correct order
  const mergedDefaultSection = [];
  let defaultSectionIndex = 0;

  for (const line of newDefaultSection) {
    if (line === null) {
      // Placeholder - insert corresponding user value
      // Find the next user value
      while (defaultSectionIndex < defaultSection.length) {
        const userLine = defaultSection[defaultSectionIndex++];
        const trimmed = userLine.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          mergedDefaultSection.push(userLine);
          break;
        }
      }
    } else {
      mergedDefaultSection.push(line);
    }
  }

  // Find any user-added lines in default section that aren't in new defaults
  // These should be moved to custom section
  const userAddedToDefaults = [];

  for (const line of defaultSection) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (isEnvFile) {
      // For .env, check if key exists in new defaults
      const key = trimmed.split('=')[0].trim();
      if (key && !newDefaultKeys.has(key) && !existingCustomKeys.has(key)) {
        // User added this key to defaults section - move to custom
        userAddedToDefaults.push(line);
      }
    } else {
      // For .gitignore, check if line exists in new defaults
      // We need to check if this exact line appears in the new default section
      const lineExistsInNewDefaults = newLines.some(newLine => {
        return newLine.trim() === trimmed;
      });

      if (!lineExistsInNewDefaults) {
        // User added this line to defaults section - move to custom
        userAddedToDefaults.push(line);
      }
    }
  }

  // Build final result
  const result = [];

  // Add default section
  result.push(DEFAULT_SECTION_MARKER);
  result.push(...mergedDefaultSection);

  // Add custom section
  result.push('');
  result.push(CUSTOM_SECTION_MARKER);

  // First add any user lines that were in default section (moved to custom)
  if (userAddedToDefaults.length > 0) {
    result.push(...userAddedToDefaults);
  }

  // Then add existing custom section
  result.push(...customSection);

  return result.join('\n');
}

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
    .pipe(createTemplateTransform({site: config, versions: package.engines}))
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

    // Handle line-based merging (.gitignore, .env)
    if (options.mergeLines && exists && !isBinaryFile) {
      try {
        const existingContent = jetpack.read(fullOutputPath);
        const newContent = file.contents.toString();

        // Merge line-by-line, passing the filename to handle .env differently
        const mergedContent = mergeLineBasedFiles(existingContent, newContent, item.name);

        // Update file contents
        file.contents = Buffer.from(mergedContent);

        logger.log(`Merged line-based file: ${relativePath}`);
      } catch (error) {
        logger.error(`Error merging line-based file ${relativePath}:`, error);
        // Fall through to normal processing if merge fails
      }
    }

    // Skip if instructed
    if (options.skip || (!options.overwrite && exists && !options.merge && !options.mergeLines)) {
      // Log if loud is enabled
      if (LOUD) {
        logger.log(`Skipping file: ${relativePath}`);
      }

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
    merge: false,
    mergeLines: false,
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
