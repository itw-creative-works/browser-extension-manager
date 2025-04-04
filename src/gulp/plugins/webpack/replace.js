// Libraries
const { template } = require('node-powertools');

// Plugin
class ReplacePlugin {
  constructor(replacements) {
    this.replacements = replacements
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
            // Skip non-JS files
            if (!filename.endsWith('.js')) {
              continue
            }

            // Get the asset
            let asset = assets[filename]
            let content = asset.source();

            // Use template interpolation
            content = template(content, this.replacements, {
              brackets: ['%%%', '%%%'],
            })

            // Update the asset
            compilation.updateAsset(
              filename,
              new compiler.webpack.sources.RawSource(content)
            )
          }
        }
      )
    })
  }
}

// Export
module.exports = ReplacePlugin
