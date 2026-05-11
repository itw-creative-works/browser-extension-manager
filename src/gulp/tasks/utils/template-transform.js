// Libraries
const { Transform } = require('node:stream');
const { template } = require('node-powertools');
const path = require('path');

/**
 * Creates a transform stream that processes template variables in files
 **/
function createTemplateTransform(data) {
  const extensions = ['html', 'md', 'liquid', 'json', 'yml', 'yaml']

  return new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      // Skip directories
      if (file.isDirectory()) {
        return callback(null, file);
      }

      // Check if file extension matches
      const ext = path.extname(file.path).toLowerCase().slice(1);
      if (!extensions.includes(ext)) {
        return callback(null, file);
      }

      // Process the file contents
      try {
        const contents = file.contents.toString();

        // Process templates
        const templated = template(contents, data, {
          brackets: ['[', ']'],
        });

        // Update file contents if changed
        if (contents !== templated) {
          file.contents = Buffer.from(templated);
          const relativePath = file.relative || file.path;
        }
      } catch (error) {
        console.error(`Error processing templates in ${file.path}:`, error);
      }

      // Pass the file through
      callback(null, file);
    },
  });
}

module.exports = createTemplateTransform;
