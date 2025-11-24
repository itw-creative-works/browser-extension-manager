# Browser Extension Manager (BEM)

## Identity

Browser Extension Manager (BEM) is a comprehensive framework for building modern browser extensions. It provides a template-based development system with built-in build tools, component architecture, theming support, and best practices for creating cross-browser extensions.

## Quick Start

### For Consuming Projects (Extensions Built Using BEM)
1. Run `npx bxm setup` to initialize the project
2. Run `npm start` to start development
3. Load `packaged/raw/` directory in browser as unpacked extension
4. Edit files in `src/` - changes auto-reload via WebSocket

### For Framework Development (This Repository)
1. Run `npm start` to watch and compile framework changes
2. Test changes in a consuming project by linking: `npm link` (in BEM) then `npm link browser-extension-manager` (in consuming project)
3. Changes in `src/` compile to `dist/` automatically

## Architecture Overview

### Component-Based System

Extensions are organized around **components**, each representing a distinct part:

**Core Components:**
- `background` - Service worker (background script)
- `popup` - Browser action popup
- `options` - Options/settings page
- `sidepanel` - Chrome side panel
- `content` - Content scripts injected into web pages
- `pages` - Custom extension pages (e.g., dashboard, welcome)

**Each component has three parts:**
1. **View** - HTML in `src/views/[component]/index.html`
2. **Styles** - SCSS in `src/assets/css/components/[component]/index.scss`
3. **Script** - JS in `src/assets/js/components/[component]/index.js`

**Compilation output:**
- `dist/views/[component]/index.html`
- `dist/assets/css/components/[component].bundle.css`
- `dist/assets/js/components/[component].bundle.js`

### Two-Tier Architecture

**Framework Layer** (`src/` in this repository):
- Core framework code and components
- Default templates and configurations
- Build system and tooling
- Published to npm as `browser-extension-manager`

**Project Layer** (consuming extension projects):
- User's extension-specific code
- Overrides and customizations
- Receives defaults from `src/defaults/` via the `defaults` gulp task

## Framework Structure (This Repository)

```
browser-extension-manager/
├── src/                                     # Framework source code
│   ├── assets/                              # Framework assets
│   │   ├── css/                             # SCSS framework
│   │   │   ├── browser-extension-manager.scss  # Main entry point
│   │   │   ├── core/                        # Core styles (utilities, animations, initialize)
│   │   │   ├── components/                  # Component-specific styles (popup, options, content, pages)
│   │   │   └── bundles/                     # Custom bundle SCSS files
│   │   ├── js/                              # JavaScript framework
│   │   │   └── main.js
│   │   ├── themes/                          # Theme system
│   │   │   ├── _template/                   # Template for creating new themes
│   │   │   ├── bootstrap/                   # Bootstrap theme (full Bootstrap 5 source)
│   │   │   └── classy/                      # Classy theme (Bootstrap + custom design system)
│   │   └── vendor/                          # Vendor assets
│   ├── defaults/                            # Default project structure (copied to consuming projects)
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   ├── css/
│   │   │   │   │   ├── main.scss            # Global styles entry point
│   │   │   │   │   └── components/          # Component-specific overrides
│   │   │   │   ├── js/
│   │   │   │   │   └── components/          # Component JavaScript
│   │   │   │   ├── images/
│   │   │   │   └── vendor/
│   │   │   ├── views/                       # HTML views (templates)
│   │   │   ├── manifest.json                # Extension manifest (user-editable)
│   │   │   └── _locales/                    # Internationalization
│   │   ├── hooks/                           # Build hooks
│   │   ├── config/                          # Configuration files
│   │   └── CLAUDE.md                        # Project documentation template
│   ├── config/                              # Framework configuration
│   │   ├── manifest.json                    # Default manifest configuration
│   │   └── page-template.html               # HTML template for views
│   ├── gulp/                                # Build system
│   │   ├── main.js                          # Gulp entry point
│   │   ├── tasks/                           # Gulp tasks
│   │   │   ├── defaults.js                  # Copy default files to project
│   │   │   ├── distribute.js                # Distribute project files to dist/
│   │   │   ├── sass.js                      # Compile SCSS
│   │   │   ├── webpack.js                   # Bundle JavaScript
│   │   │   ├── html.js                      # Process HTML views
│   │   │   ├── icons.js                     # Generate icon sizes
│   │   │   ├── package.js                   # Package extension for distribution
│   │   │   ├── audit.js                     # Run audits
│   │   │   └── serve.js                     # Development server
│   │   └── plugins/                         # Custom plugins
│   │       └── webpack/
│   │           └── strip-dev-blocks.js      # Strip dev-only code
│   ├── lib/                                 # Utility libraries
│   │   ├── extension.js                     # Cross-browser extension API wrapper
│   │   ├── logger.js                        # Logging utility
│   │   └── logger-lite.js                   # Lightweight logger
│   ├── commands/                            # CLI commands
│   │   ├── setup.js                         # Setup project
│   │   ├── clean.js                         # Clean build artifacts
│   │   └── version.js                       # Version management
│   ├── build.js                             # Build manager class
│   ├── background.js                        # Background script manager
│   ├── popup.js                             # Popup manager
│   ├── options.js                           # Options manager
│   ├── sidepanel.js                         # Sidepanel manager
│   ├── page.js                              # Page manager
│   ├── content.js                           # Content script manager
│   └── cli.js                               # CLI entry point
├── dist/                                    # Compiled framework (published to npm)
├── bin/                                     # CLI binaries
│   └── browser-extension-manager
├── package.json
└── CLAUDE.md                                # This file
```

## Consuming Project Structure

When users create a project using BEM, they get this structure:

```
my-extension/
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.scss                    # Global styles
│   │   │   └── components/                  # Component-specific styles
│   │   ├── js/
│   │   │   └── components/                  # Component JavaScript
│   │   ├── images/
│   │   │   └── icon.png                     # Source icon (1024x1024)
│   │   └── vendor/
│   ├── views/                               # HTML templates
│   ├── _locales/                            # i18n translations
│   └── manifest.json                        # Extension manifest
├── config/
│   └── config.json                          # BEM configuration
├── hooks/
│   ├── build:pre.js                         # Pre-build hook
│   └── build:post.js                        # Post-build hook
├── dist/                                    # Compiled files (gitignored)
├── packaged/                                # Packaged extension (gitignored)
│   ├── raw/                                 # Load this in browser
│   └── extension.zip                        # Production build
└── package.json
```

## Development Instructions

### Creating a New Component

When adding a new component type to the framework:

1. **Create framework component styles:**
   ```
   src/assets/css/components/[component]/index.scss
   ```

2. **Create default template files:**
   ```
   src/defaults/src/assets/css/components/[component]/index.scss
   src/defaults/src/assets/js/components/[component]/index.js
   src/defaults/src/views/[component]/index.html
   ```

3. **Create manager class (if needed):**
   ```javascript
   // src/[component].js
   const Manager = require('./build.js');

   class ComponentManager extends Manager {
     constructor(options) {
       super(options);
     }
   }

   module.exports = ComponentManager;
   ```

4. **Export in package.json:**
   ```json
   {
     "exports": {
       "./component": "./dist/component.js"
     }
   }
   ```

### Modifying the Build System

**Key gulp tasks:**

- **defaults** ([gulp/tasks/defaults.js](src/gulp/tasks/defaults.js)) - Copies template files from `dist/defaults/` to consuming projects
- **distribute** ([gulp/tasks/distribute.js](src/gulp/tasks/distribute.js)) - Copies project files to `dist/`
- **sass** ([gulp/tasks/sass.js](src/gulp/tasks/sass.js)) - Compiles SCSS with sophisticated load path system
- **webpack** ([gulp/tasks/webpack.js](src/gulp/tasks/webpack.js)) - Bundles JavaScript with Babel
- **html** ([gulp/tasks/html.js](src/gulp/tasks/html.js)) - Processes HTML views into templates
- **package** ([gulp/tasks/package.js](src/gulp/tasks/package.js)) - Creates packaged extension
- **serve** ([gulp/tasks/serve.js](src/gulp/tasks/serve.js)) - WebSocket server for live reload

### Modifying Themes

**Theme location:** [src/assets/themes/](src/assets/themes/)

**Available themes:**
- `bootstrap` - Pure Bootstrap 5.3+
- `classy` - Bootstrap + custom design system
- `_template` - Template for new themes

**Theme structure:**
```
src/assets/themes/[theme-id]/
├── _config.scss      # Theme variables (with !default)
├── _theme.scss       # Theme entry point
├── scss/             # Theme-specific SCSS
└── js/               # Theme-specific JS
```

**To create a new theme:**
1. Copy `_template/` to new directory
2. Customize `_config.scss` variables
3. Add theme-specific styles in `scss/`
4. Users activate via `config/config.json`

### Working with the Defaults System

**Location:** [src/defaults/](src/defaults/)

**How it works:**
1. Files in `src/defaults/` are the starter template
2. During build, they're copied to `dist/defaults/`
3. When users run `npx bxm setup`, files copy from `dist/defaults/` to their project
4. File behavior controlled by `FILE_MAP` in [gulp/tasks/defaults.js](src/gulp/tasks/defaults.js)

**File map rules:**
```javascript
const FILE_MAP = {
  'src/**/*': { overwrite: false },           // Never overwrite user code
  'hooks/**/*': { overwrite: false },         // Never overwrite hooks
  '.nvmrc': { template: { node: '22' } },    // Template with data
  // ...
};
```

**Rule types:**
- `overwrite: false` - Never replace if exists
- `overwrite: true` - Always update
- `skip: function` - Dynamic skip logic
- `template: data` - Run templating
- `name: function` - Rename file

### CSS Architecture

**Main entry:** [src/assets/css/browser-extension-manager.scss](src/assets/css/browser-extension-manager.scss)

**Core modules:**
- [core/_initialize.scss](src/assets/css/core/_initialize.scss) - Base resets
- [core/_utilities.scss](src/assets/css/core/_utilities.scss) - Utility classes
- [core/_animations.scss](src/assets/css/core/_animations.scss) - Animations

**Component system:**
Each component can have framework defaults in `src/assets/css/components/[name]/index.scss`

**Load path resolution:**
1. Framework CSS (`node_modules/browser-extension-manager/dist/assets/css`)
2. Active theme (`node_modules/browser-extension-manager/dist/assets/themes/[theme-id]`)
3. Project dist (`dist/assets/css`)
4. node_modules

This enables:
```scss
@use 'browser-extension-manager' as * with ($primary: #5B47FB);
@use 'theme' as *;  // Resolves to active theme
@use 'components/popup' as *;  // Import default component styles
```

### JavaScript Architecture

**Manager classes:** [src/background.js](src/background.js), [src/popup.js](src/popup.js), [src/options.js](src/options.js), [src/sidepanel.js](src/sidepanel.js), [src/page.js](src/page.js), [src/content.js](src/content.js)

**Extension API wrapper:** [src/lib/extension.js](src/lib/extension.js)

A universal/agnostic API wrapper that enables cross-browser extension development. Write your extension once and it works on Chrome, Firefox, Edge, and other browsers.

**How it works:**
- Detects and normalizes APIs from `chrome.*`, `browser.*`, and `window.*` namespaces
- Automatically selects the correct API based on what's available in the current browser
- Exports a singleton with unified access to all extension APIs

**Supported APIs:**
`action`, `alarms`, `bookmarks`, `browsingData`, `browserAction`, `certificateProvider`, `commands`, `contentSettings`, `contextMenus`, `cookies`, `debugger`, `declarativeContent`, `declarativeNetRequest`, `devtools`, `dns`, `documentScan`, `downloads`, `enterprise`, `events`, `extension`, `extensionTypes`, `fileBrowserHandler`, `fileSystemProvider`, `fontSettings`, `gcm`, `history`, `i18n`, `identity`, `idle`, `input`, `instanceID`, `management`, `notifications`, `offscreen`, `omnibox`, `pageAction`, `permissions`, `platformKeys`, `power`, `printerProvider`, `privacy`, `proxy`, `runtime`, `scripting`, `search`, `sessions`, `sidePanel`, `storage`, `tabGroups`, `tabs`, `topSites`, `tts`, `ttsEngine`, `userScripts`, `vpnProvider`, `wallpaper`, `webNavigation`, `webRequest`, `windows`

**Usage:**
```javascript
// Exposed via manager - no separate import needed
const Manager = new (require('browser-extension-manager/popup'));

Manager.initialize().then(() => {
  const { extension } = Manager;

  // Works on Chrome, Firefox, Edge, etc.
  extension.tabs.query({ active: true }, (tabs) => { ... });
  extension.storage.get('key', (result) => { ... });
  extension.runtime.sendMessage({ type: 'hello' });
});
```

**Storage normalization:**
The wrapper automatically resolves `storage` to `storage.sync` if available, falling back to `storage.local`.

**Logger:** [src/lib/logger.js](src/lib/logger.js)
- Full logging utility
- [src/lib/logger-lite.js](src/lib/logger-lite.js) for lightweight contexts

**Template replacement:**
Webpack plugin replaces markers during build:
- `%%% version %%%` → package version
- `%%% brand.name %%%` → brand name
- `%%% environment %%%` → 'production' or 'development'
- `%%% liveReloadPort %%%` → WebSocket port
- `%%% webManagerConfiguration %%%` → JSON config

### Build Hooks System

**Hook locations:**
- `hooks/build:pre.js` - Before packaging
- `hooks/build:post.js` - After packaging

**Hook structure:**
```javascript
module.exports = async function (index) {
  // index contains build information
  console.log('Hook running...');
};
```

**Implementation:** [src/gulp/tasks/package.js](src/gulp/tasks/package.js) loads and executes hooks

### CLI System

**Entry point:** [bin/browser-extension-manager](bin/browser-extension-manager)

**CLI implementation:** [src/cli.js](src/cli.js)

**Commands:** [src/commands/](src/commands/)
- [setup.js](src/commands/setup.js) - Initialize project
- [clean.js](src/commands/clean.js) - Clean build artifacts
- [version.js](src/commands/version.js) - Show version

**Aliases in package.json:**
```json
{
  "bin": {
    "ext": "bin/browser-extension-manager",
    "xm": "bin/browser-extension-manager",
    "bxm": "bin/browser-extension-manager",
    "browser-extension-manager": "bin/browser-extension-manager"
  }
}
```

## Best Practices for Framework Development

### File Organization

1. **Keep framework code in src/** - Never edit `dist/` directly
2. **Use modular design** - Per Ian's standards, build modular code, not one giant file
3. **Maintain defaults/** - Keep template files up-to-date
4. **Document changes** - Update CLAUDE.md

### Coding Standards (Per Ian's Preferences)

**Short-circuit pattern:**
```javascript
// Good
const $el = document.querySelector('...');
if (!$el) {
  return;
}
// Long code block

// Bad
if ($el) {
  // Long code block
}
```

**Logical operators:**
```javascript
// Good
const a = b
  || c
  || d;

// Bad
const a = b ||
  c ||
  d;
```

**DOM element naming:**
```javascript
const $submitBtn = document.querySelector('#submit');
const $emailInput = document.querySelector('#email');
```

**File operations:**
```javascript
// Prefer fs-jetpack
const jetpack = require('fs-jetpack');
jetpack.write('file.txt', 'content');
```

### Backwards Compatibility

**Per Ian's instructions:**
- **DO NOT** make changes backwards compatible unless explicitly requested
- Most changes are for unreleased code or local development
- If we develop something and change it later, just change it - don't maintain old way
- Only add backwards compatibility when specifically asked

### Version Control

**Commit:**
- `src/` - All framework source code
- `package.json` - Package configuration
- Documentation (CLAUDE.md)

**Ignore:**
- `dist/` - Compiled framework (generated by prepare-package)
- `node_modules/`

## Testing Changes

### Local Testing

1. **Make changes in src/**
2. **Compile:** `npm start` (watches and compiles to dist/)
3. **Link locally:**
   ```bash
   npm link
   ```
4. **In consuming project:**
   ```bash
   npm link browser-extension-manager
   npm start
   ```
5. **Test in browser:**
   Load `packaged/raw/` directory

### Testing Build System

**Test individual gulp tasks:**
```bash
cd consuming-project/
npm run gulp -- [task-name]
```

**Available tasks:**
- `defaults` - Test template copying
- `sass` - Test SCSS compilation
- `webpack` - Test JS bundling
- `html` - Test HTML processing
- `package` - Test extension packaging

### Testing CLI

**In this repository:**
```bash
./bin/browser-extension-manager setup
./bin/browser-extension-manager clean
./bin/browser-extension-manager version
```

**Or via npm:**
```bash
npx bxm setup
npx bxm clean
npx bxm version
```

## Publishing Updates

### Preparation

1. **Update version** in [package.json](package.json)
2. **Compile framework:**
   ```bash
   npm run prepare
   ```
3. **Test in consuming project**
4. **Update documentation** if needed

### Publishing to npm

```bash
npm publish
```

**Published package includes:**
- `dist/` - Compiled framework
- `bin/` - CLI binaries
- `package.json`
- `README.md`

**Excluded via .npmignore:**
- `src/` - Source code (users don't need this)
- Development files

## Common Development Tasks

### Adding a Utility Class

**Location:** [src/assets/css/core/_utilities.scss](src/assets/css/core/_utilities.scss)

```scss
// Add new utility
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### Adding a Theme Variable

**Location:** [src/assets/themes/classy/_config.scss](src/assets/themes/classy/_config.scss) (or relevant theme)

```scss
$new-color: #FF6B6B !default;

// Make available to consumers
@forward '../bootstrap/scss/bootstrap.scss' with (
  $new-color: $new-color
);
```

### Adding a Webpack Alias

**Location:** [src/gulp/tasks/webpack.js](src/gulp/tasks/webpack.js)

```javascript
resolve: {
  alias: {
    '__new_alias__': path.resolve(paths.root, 'path/to/directory'),
  }
}
```

### Adding a Template Replacement

**Location:** [src/gulp/tasks/webpack.js](src/gulp/tasks/webpack.js)

```javascript
new ReplacePlugin({
  patterns: [
    {
      find: /%%% newVariable %%%/g,
      replacement: 'value'
    }
  ]
})
```

### Modifying Default Manifest

**Location:** [src/config/manifest.json](src/config/manifest.json)

```json5
{
  // Add new default permission
  permissions: [
    'storage',
    'newPermission'
  ]
}
```

**Compilation:** [src/gulp/tasks/package.js](src/gulp/tasks/package.js) merges user manifest with defaults

## Troubleshooting Framework Development

### Changes not appearing in consuming project

1. **Rebuild framework:** `npm run prepare`
2. **Reinstall in consuming project:** `npm install browser-extension-manager@latest`
3. **Or use local link:** `npm link` (in BEM) then `npm link browser-extension-manager` (in project)

### Gulp task errors

1. **Check task file:** [src/gulp/tasks/](src/gulp/tasks/)
2. **Verify paths** are correct
3. **Check for syntax errors**
4. **Test task individually:** `npm run gulp -- task-name`

### SCSS compilation errors

1. **Check load paths** in [src/gulp/tasks/sass.js](src/gulp/tasks/sass.js)
2. **Verify theme structure**
3. **Check for circular imports**
4. **Test with minimal SCSS** to isolate issue

### Template replacement not working

1. **Check pattern** in [src/gulp/tasks/webpack.js](src/gulp/tasks/webpack.js)
2. **Verify replacement value** is correct
3. **Check if file is processed** by webpack

## Notable Dependencies

### Web Manager
BEM integrates **Web Manager** for Firebase, analytics, and web services functionality. Each component manager initializes Web Manager automatically with configuration from `config/config.json`.

**Web Manager API:**
- Study the Web Manager API and documentation in the sibling repository
- Location: `../web-manager/` (relative to this project)
- GitHub: https://github.com/itw-creative-works/web-manager
- npm: https://www.npmjs.com/package/web-manager

**Usage in BEM:**
```javascript
const Manager = new (require('browser-extension-manager/popup'));

Manager.initialize().then(() => {
  const { webManager } = Manager;

  // Web Manager provides:
  // - Firebase (Firestore, Auth, Storage, etc.)
  // - Analytics
  // - User management
  // - Utilities
  const db = webManager.libraries.firebase.firestore();
});
```

### Other Key Dependencies
- **Gulp** - Build system and task automation
- **Webpack** - JavaScript bundling with Babel transpilation
- **Sass** - CSS preprocessing with advanced features
- **fs-jetpack** - File operations (per Ian's preference)
- **wonderful-fetch** - HTTP requests
- **wonderful-version** - Version management
- **ws** - WebSocket server for live reload

## Resources

- **GitHub**: https://github.com/itw-creative-works/browser-extension-manager
- **npm**: https://www.npmjs.com/package/browser-extension-manager
- **Chrome Extensions**: https://developer.chrome.com/docs/extensions/
- **Firefox Add-ons**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions

## Key Files Reference

**Build System:**
- [src/gulp/main.js](src/gulp/main.js) - Gulp entry point
- [src/gulp/tasks/](src/gulp/tasks/) - All build tasks
- [src/build.js](src/build.js) - Build manager base class

**Manager Classes:**
- [src/background.js](src/background.js) - Background script manager
- [src/popup.js](src/popup.js) - Popup manager
- [src/options.js](src/options.js) - Options manager
- [src/sidepanel.js](src/sidepanel.js) - Sidepanel manager
- [src/page.js](src/page.js) - Custom page manager
- [src/content.js](src/content.js) - Content script manager

**Utilities:**
- [src/lib/extension.js](src/lib/extension.js) - Cross-browser API wrapper
- [src/lib/logger.js](src/lib/logger.js) - Logging utility
- [src/cli.js](src/cli.js) - CLI implementation

**CSS Framework:**
- [src/assets/css/browser-extension-manager.scss](src/assets/css/browser-extension-manager.scss) - Main entry
- [src/assets/css/core/](src/assets/css/core/) - Core styles
- [src/assets/css/components/](src/assets/css/components/) - Component styles
- [src/assets/themes/](src/assets/themes/) - Theme system

**Templates:**
- [src/defaults/](src/defaults/) - Project starter template
- [src/config/manifest.json](src/config/manifest.json) - Default manifest
- [src/config/page-template.html](src/config/page-template.html) - HTML template

**CLI:**
- [bin/browser-extension-manager](bin/browser-extension-manager) - CLI entry
- [src/commands/](src/commands/) - CLI commands
