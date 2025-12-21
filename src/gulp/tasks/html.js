// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('html');
const { src, dest, watch, series } = require('gulp');
const through2 = require('through2');
const jetpack = require('fs-jetpack');
const path = require('path');
const { template } = require('node-powertools');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const config = Manager.getConfig('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Glob
const input = [
  // Files to include
  'src/views/**/*.html',

  // Files to exclude
  '!src/views/**/_*.html',
];
const output = 'dist/views';
const delay = 250;

// Main task
function html(complete) {
  // Log
  logger.log('Starting...');

  // Load the template
  const templatePath = path.join(rootPathPackage, 'dist', 'config', 'page-template.html');
  const templateContent = jetpack.read(templatePath);

  if (!templateContent) {
    logger.error('Template not found at:', templatePath);
    return complete();
  }

  // Process HTML files
  return src(input)
    .pipe(processHtml(templateContent))
    .pipe(dest(output))
    .on('finish', () => {
      logger.log('Finished!');
      return complete();
    });
}

// Process HTML transform
function processHtml(templateContent) {
  return through2.obj(function (file, _, callback) {
    // Skip if it's a directory
    if (file.isDirectory()) {
      return callback(null, file);
    }

    try {
      // Get the view name from the file path
      const viewName = path.basename(file.path, '.html');
      const relativePath = path.relative(path.join(rootPathProject, 'src/views'), file.dirname);
      const viewNameWithPath = relativePath ? `${relativePath}/${viewName}` : viewName;

      // Read the content (body HTML)
      const bodyContent = file.contents.toString();

      // Determine the component name for CSS/JS loading
      // Template already includes /components/ prefix, so just provide the component path
      // Pages can have multiple files (index, pricing, login, etc.)
      // Other components (popup, options, etc.) only have index.html
      let componentName;
      if (relativePath.startsWith('pages/') || relativePath === 'pages') {
        // Pages directory: include full path with filename
        // pages/index.html -> pages/index
        // pages/pricing.html -> pages/pricing
        componentName = viewNameWithPath;
      } else if (relativePath && viewName === 'index') {
        // Other components with index.html: use just the directory name
        // popup/index.html -> popup
        // options/index.html -> options
        componentName = relativePath;
      } else if (relativePath) {
        // Non-index files in other directories: use full path
        componentName = viewNameWithPath;
      } else {
        // No path: use viewName
        componentName = viewName;
      }

      // Prepare template data
      const data = {
        content: bodyContent,
        page: {
          name: componentName,
          path: viewNameWithPath,
          title: config.brand?.name || 'Extension',
        },
        theme: {
          appearance: config.theme?.appearance || 'dark',
        },
        brand: config.brand || {},
        cacheBust: Date.now(),
      };

      // Apply template with custom brackets
      // First, template the body content to replace any {{ }} placeholders in the view
      const templatedBody = template(bodyContent, data, {
        brackets: ['{{', '}}'],
      });

      // Update data with templated body
      data.content = templatedBody;

      // Then template the outer page template
      const rendered = template(templateContent, data, {
        brackets: ['{{', '}}'],
      });

      // Update file contents
      file.contents = Buffer.from(rendered);

      // Log
      logger.log(`Processed: ${viewNameWithPath}.html`);

      // Push the file
      this.push(file);
      return callback();
    } catch (error) {
      logger.error('Error processing HTML:', error);
      return callback(error);
    }
  });
}

// Watcher task
function htmlWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay, dot: true }, html)
    .on('change', function (path) {
      logger.log(`[watcher] File ${path} was changed`);
    });

  // Complete
  return complete();
}

// Export task
module.exports = series(html, htmlWatcher);
