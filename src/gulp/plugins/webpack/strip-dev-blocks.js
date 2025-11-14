// Plugin: StripDevBlocksPlugin
class StripDevBlocksPlugin {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        fileTest: /\.js$/,
        startMarker: '/* @dev-only:start */',
        endMarker: '/* @dev-only:end */',
      },
      options
    )
    this.enabled = process.env.BEM_BUILD_MODE === 'true'
  }

  apply(compiler) {
    if (!this.enabled) return

    compiler.hooks.compilation.tap('StripDevBlocksPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'StripDevBlocksPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        (assets) => {
          for (const filename in assets) {
            if (!this.options.fileTest.test(filename)) continue

            let source = assets[filename].source()

            // Strip everything between start and end marker
            const pattern = new RegExp(
              `${this.escape(this.options.startMarker)}[\\s\\S]*?${this.escape(this.options.endMarker)}`,
              'g'
            )
            source = source.replace(pattern, '')

            compilation.updateAsset(
              filename,
              new compiler.webpack.sources.RawSource(source)
            )
          }
        }
      )
    })
  }

  escape(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

// Export
module.exports = StripDevBlocksPlugin
