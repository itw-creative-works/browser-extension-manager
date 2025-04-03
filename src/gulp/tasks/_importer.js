const customAliasImporter = {
  canonicalize(url) {
    if (url.startsWith('@themes/')) {
      const fullPath = path.resolve(
        rootPathProject,
        'node_modules/browser-extension-manager/dist/assets/themes',
        url.replace('@themes/', '')
      )

      console.log('🧭 [SASS IMPORTER] canonicalize:', url)
      console.log('✅ [SASS IMPORTER] Resolved to:', fullPath)

      return new URL(`file://${fullPath}`)
    }

    return null
  },

  load(canonicalUrl) {
    const fs = require('fs')
    const filePath = canonicalUrl.pathname

    console.log('📦 [SASS IMPORTER] Loading file from:', filePath)

    if (fs.existsSync(filePath)) {
      return {
        contents: fs.readFileSync(filePath, 'utf8'),
        syntax: 'scss'
      }
    }

    console.log('❌ [SASS IMPORTER] File not found:', filePath)
    return null
  }
}
