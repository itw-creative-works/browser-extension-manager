// Plugin
class ReplacePlugin {
  constructor(replacements) {
    this.replacements = this.flatten(replacements)
  }

  flatten(obj, prefix = '') {
    let result = {}
    for (let key in obj) {
      let value = obj[key]
      let path = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        Object.assign(result, this.flatten(value, path))
      } else {
        result[`{ ${path} }`] = value
      }
    }
    return result
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
            if (filename.endsWith('.js')) {
              let asset = assets[filename]
              let content = asset.source()

              for (const [placeholder, replacement] of Object.entries(this.replacements)) {
                const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')
                content = content.replace(regex, replacement)
              }

              compilation.updateAsset(
                filename,
                new compiler.webpack.sources.RawSource(content)
              )
            }
          }
        }
      )
    })
  }
}

// Export
module.exports = ReplacePlugin
