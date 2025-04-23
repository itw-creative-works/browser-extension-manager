// Libraries
const { template } = require('node-powertools');

// Plugin
class ReplacePlugin {
  constructor(replacements = {}, options = {}) {
    this.replacements = replacements
    this.options = Object.assign(
      {
        type: 'template', // 'template' | 'raw'
        brackets: ['%%%', '%%%'], // Template brackets
        fileTest: /\.js$/, // Default: only replace in JS files
        regex: false, // Use regex for replacements
      },
      options
    )
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('ReplacePlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ReplacePlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        (assets) => {
          for (const filename in assets) {
            // Check if the file matches the test
            if (!this.options.fileTest.test(filename)) {
              continue
            }

            // Get the asset
            let asset = assets[filename];
            let content = asset.source();

            // Log
            // console.log('Processing', filename);

            // Replace content
            if (this.options.type === 'template') {
              content = template(content, this.replacements, {
                brackets: this.options.brackets,
              })
            } else if (this.options.type === 'raw') {
              for (const key in this.replacements) {
                const value = this.replacements[key]

                if (this.options.regex && key.startsWith('/') && key.lastIndexOf('/') > 0) {
                  try {
                    const lastSlash = key.lastIndexOf('/');
                    const pattern = key.slice(1, lastSlash);
                    const flags = key.slice(lastSlash + 1);
                    const regex = new RegExp(pattern, flags);

                    // Update the content
                    content = content.replace(regex, value);
                  } catch (err) {
                    console.warn('Regex error in key:', key, err);
                  }
                } else {
                  // Replace all instances of the key with the value
                  const regex = new RegExp(key, 'g');

                  // Update the content
                  content = content.replace(regex, value);
                }
              }
            }

            // Update the asset
            compilation.updateAsset(
              filename,
              new compiler.webpack.sources.RawSource(content)
            );
          }
        }
      )
    })
  }
}

// Export
module.exports = ReplacePlugin
