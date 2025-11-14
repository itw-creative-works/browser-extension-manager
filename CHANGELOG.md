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
## [1.1.0] - 2025-01-13
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
