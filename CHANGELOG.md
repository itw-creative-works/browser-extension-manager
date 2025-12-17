# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## Changelog Categories

- `BREAKING` for breaking changes.
- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.

---
## [1.3.0] - 2025-12-16

### Added
- Multi-target builds for Chromium, Firefox, and Opera with automatic manifest adjustments
- Chromium build uses `background.service_worker`, Firefox build uses `background.scripts`
- Opera build auto-resolves `__MSG_*__` placeholders in `short_name` (Opera enforces 12-char limit including placeholder text)
- Browser-specific `TARGETS` config object with `adjustManifest()` functions for each target
- Opera loading instructions in BUILD_INSTRUCTIONS.md

### Changed
- Packaged output structure changed from `packaged/raw/` to `packaged/{chromium,firefox,opera}/raw/`
- Extension zip moved from `packaged/extension.zip` to `packaged/{chromium,firefox,opera}/extension.zip`
- `package.js` now creates separate builds for each browser target using configurable `TARGETS` object
- `publish.js` uses target-specific paths (chromium zip for Chrome/Edge, firefox raw for Firefox, opera zip for Opera)
- `audit.js` audits chromium build (code is identical between targets)
- Manifest compilation now uses 3-step process: apply defaults → target adjustments → cleanup

## [1.1.13] - 2025-11-26
### Added
- Default `.env` file with publish credential templates for all stores
- Intelligent line-based merging for `.gitignore` and `.env` files with section markers
- Template variable support for `.yml` and `.yaml` files

### Changed
- Credentials now read from `.env` file instead of config (better security)
- `.gitignore` and `.env` files use section markers to separate defaults from custom values
- Template transform now passes `versions` data for workflow templating

## [1.1.6] - 2025-11-14
### Added
- Bootstrap exposure to `window.bootstrap` in all UI components (popup, options, sidepanel, page)
- `@popperjs/core` dependency for Bootstrap's Dropdown, Tooltip, and Popover components
- Project-specific JS files to webpack watch paths for improved hot reloading

### Changed
- Modernized content.js manager from prototype-based to ES6 class syntax with async/await
- Updated affiliatizer import to use dynamic import in content.js
- Improved logging consistency across all manager classes

## [1.1.1] - 2025-11-13
### Changed
- Simplified build.js configuration generation by removing webManager config overrides
- Improved theme JS file watching in webpack config
- Updated Firebase dependencies to latest versions (firebase 12.6.0)

### Added
- Cache busting support for CSS/JS includes in page template (?cb={{ cacheBust }})
- build.js script loading to page template for runtime configuration
- web-manager watch path for improved development workflow

### Fixed
- Removed verbose logging in background.js initialization
- Browser caching issues during development with cache-busted resource URLs

## [1.1.0] - 2025-11-13
### BREAKING
- Complete CSS architecture overhaul - projects using old structure will need migration
- Removed static Bootstrap CSS files in favor of SCSS source compilation
- Changed default file structure for consuming projects

### Added
- Modular component-based CSS architecture
- New main entry point: `browser-extension-manager.scss`
- Core CSS modules: initialize, utilities, animations
- Component-specific CSS directories with bundle support
- Full Bootstrap 5 SCSS source integration
- Classy theme with custom design system
- Theme template (`_template/`) for creating new themes
- New component managers: popup, options, sidepanel, page
- HTML template system via `page-template.html`
- Views directory structure for organized HTML templates
- Component-specific override system in defaults
- New gulp tasks: `html.js`, `audit.js`
- Webpack plugin to strip dev-only code blocks
- `gulp-filter` dependency for advanced build filtering
- Package exports for all component managers

### Changed
- Upgraded Bootstrap theme to use full source (scss/) instead of compiled CSS
- Refactored defaults structure with component-specific organization
- Reorganized project architecture for better modularity
- Updated build system to support new component architecture

### Removed
- `fontawesome.scss` (moved to component-specific imports)
- `main.scss` (replaced by component system)
- Static Bootstrap CSS/JS files (now compiled from source)
- Legacy HTML pages in `src/defaults/src/pages/`
- Legacy asset structure in defaults
- Obsolete `themes.js` gulp task
- Old static JavaScript files (background.js, popup.js, etc. in defaults)

### Fixed
- Improved maintainability with modular architecture
- Better theme customization support
- Enhanced build process for component isolation

## [1.0.0] - 2024-06-19
### Added
- Initial release of the project 🚀
