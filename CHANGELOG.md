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
## [1.7.0] - 2026-06-23

### Added

- **Supply-chain security via Socket Firewall.** New `src/lib/safe-install.js` exports `safeInstall()` — a wrapper that detects `sfw` (Socket Firewall) on the system and prefixes install commands with it, blocking confirmed malware at the network level before packages reach disk. Falls back to plain npm when sfw is unavailable. `install.js` and `setup.js` CLI commands now route through `safeInstall()` instead of raw `execute()`. Consumer CI default (`src/defaults/.github/workflows/publish.yml`) now installs sfw globally and runs `sfw npm install`.
- **`docs/cdp-debugging.md` — launching a controllable browser (mirrored across UJM/BEM/BXM/EM).** The canonical Chrome launch for agents and humans: CDP port + REQUIRED dedicated `--user-data-dir` (Chrome 136+ silently ignores the debug port on the default profile — verified on 149), the persistent agent profile, the shared-instance model (CDP is multi-client), safe quit by profile match, and driving via the `chrome-devtools` MCP. BXM flavor: `--load-extension` is dead on stable Chrome — load unpacked once via `chrome://extensions` in the persistent agent profile.
- **npm tarball expanded** — `files` field now includes `bin/`, `docs/`, and `CLAUDE.md` alongside `dist/`. Consumers get the full docs and CLI binary in their `node_modules/`.
- **CLAUDE.md updates** — mirrored-structure note (shared across BEM/UJM/BXM/EM) and Supply-Chain Security section documenting the `safeInstall` pattern.

---
## [1.6.1] - 2026-06-11

### Added

- **`docs/audit.md` — full-audit check catalog (`/omega:bxm audit`).** ID'd, severity-graded checks with scope auto-detect (consumer vs framework via package.json): mirrored universal checks (U-01..U-14 — tests at every layer, XSS escaping, secrets incl. store-publishing credentials, config canon, doc parity, dead code, dep health, …), BXM-specific checks (BXM-01..BXM-06 — `extension.*` wrapper over raw `chrome.*`, fragment views + three-part component structure, service-worker-safe background, justified manifest permissions, store-listing format + translation-cache hygiene, view a11y), and framework-repo checks (F-01..F-04). Findings persist to `.temp/audit/claude-audit.md`; fixes run as a severity-ordered TodoWrite loop ending with a green `npx mgr test`. Wired to the `omega:bxm` router's Audit process; `docs/audit.md` is mirrored across UJM/BEM/EM. Indexed in CLAUDE.md.

### Changed

- **package.json `keywords` corrected** — replaced the stale template keywords (`Jekyll`, `imagemin`, `Browsersync`, `Autoprefixer`, `PostCSS` — none used by BXM) with accurate ones (`browser-extension`, `chrome-extension`, `firefox-extension`, `edge-extension`, `web-extension`, `manifest-v3`, plus the genuinely-used `gulp`/`sass`/`webpack`). npm-listing metadata only; no behavior change. Mirrored across UJM/BEM/EM.

---
## [1.6.0] - 2026-06-11

### Changed

- **Router skill renamed `BXM:patterns` → `omega:bxm`** — all framework skills now live under the `omega:` namespace (`omega:em`/`omega:bxm`/`omega:ujm`/`omega:bem` + the `omega:main` hub). CLAUDE.md's Recommended skills section updated.
- Bumped `@babel/core` from ^7.29.0 to ^7.29.7
- Bumped `@babel/preset-env` from ^7.29.5 to ^7.29.7
- Bumped `sass` from ^1.99.0 to ^1.100.0
- Bumped `web-manager` from ^4.1.42 to ^4.2.0
- Bumped `webpack` from ^5.106.2 to ^5.107.2
- Bumped `ws` from ^8.20.0 to ^8.21.0

### Added

- **`docs/publishing.md` — store listing description section (action-skill consolidation).** The standalone `BXM:write-description` skill was deleted and folded into `omega:bxm` as a process checklist; the Chrome Web Store description format (full template incl. the fixed Bonus/Privacy sections, copywriting rules, translation-cache invalidation steps) now lives in `docs/publishing.md` since it documents `config/description.md`.
- **Dev-process guidance relaxed: only `npm start` is off-limits.** The "NEVER run" rule in CLAUDE.md now prohibits only the long-running dev watcher (instruct the user to start it if it isn't running; read `logs/*.log`, never tail the process) — `npx mgr test` and `npm run build` are fine to run.
- **Designated test consumer documented** — `../powertools-browser-extension` is BXM's consumer project for validating framework changes end-to-end (builds, tests, packaging, runtime — any consumer-level flow may be exercised there freely); CLAUDE.md's framework-development workflow now names it alongside the `npx mgr install dev` / `live` swap.
- **`docs/xss-prevention.md` + `docs/offscreen.md`**: migrated from the `omega:bxm` skill into the repo — `xss-prevention.md` (mirrors UJM's filename) carries the canonical inline `escapeHTML`/`sanitizeURL` forms, the never-write-your-own-helper rule, extension-specific attack vectors (tab.title/url/favIconUrl, content-script DOM), the sanitize matrix, and the do-NOT-escape list; `offscreen.md` carries the offscreen-document lifecycle (single-instance `getContexts` check, `createDocument` from background, two-way messaging). `components.md` gained a "Manifest wiring per component" section (action.default_popup / options_ui.page / side_panel.default_path / background.service_worker / offscreen permission). All indexed in CLAUDE.md. Part of the skills-as-routers refactor: framework facts live in repo docs (version-matched via `node_modules`); the skill now only routes + carries Claude-workflow rules and process checklists.

- **Docs parity — new `docs/logging.md`, `docs/icons.md`, `docs/common-mistakes.md`.** `logging.md` is now the SSOT for the `dev.log`/`build.log`/`test.log` tee (extracted from build-system.md, which keeps a pointer — mirrors EM's logging.md); `icons.md` documents the one-source-icon → all-sizes generation pipeline + manifest wiring (mirrors EM's icons.md concept); `common-mistakes.md` extracts the canonical anti-pattern list into the repo (BEM already had one). `templating.md`'s H1 normalized `# HTML Templating` → `# Templating` (matches EM/UJM). All indexed in CLAUDE.md → Documentation.
- **Test coverage convention (docs).** New mirrored "Test coverage" sections in `CLAUDE.md`, `docs/test-framework.md`, `src/defaults/CLAUDE.md`, and `src/defaults/test/README.md` — every feature ships with tests at every layer it has a surface in (logic `build`/`background`, UI `view`, end-to-end `boot`); a layer is skipped only when the feature genuinely has no surface there. Mirrored across EM/BEM/UJM.
- **Gulp pipeline tees output to `logs/dev.log` / `logs/build.log`.** `src/gulp/main.js` now duplicates all stdout/stderr (ANSI-stripped) to `<projectRoot>/logs/dev.log` on `npm start` and `logs/build.log` on `npm run build` (`BXM_BUILD_MODE=true`), truncated fresh each run — closes the gap with EM's `dev.log` and UJM's `dev.log`/`build.log` tee. Disable with `BXM_LOG_FILE=false`; override the path with `BXM_LOG_FILE=<path>`. See [docs/build-system.md](docs/build-system.md#log-files).
- **`npx mgr test` tees output to `logs/test.log`.** All test-runner output is now duplicated (ANSI-stripped) to `<projectRoot>/logs/test.log`, truncated fresh on each run — mirrors EM's and BEM's `test.log` pattern (new `src/utils/attach-log-file.js`). Grep the file after a run instead of scrolling terminal scrollback.
- **Extended test mode standardized on `TEST_EXTENDED_MODE`.** Replaced the old `--integration` / `BXM_TEST_INTEGRATION` flag with the shared, **unprefixed `TEST_EXTENDED_MODE`** env var — the SAME name across BEM/BXM/UJM/EM (canonical name is BEM's). Opt in via `npx mgr test --extended` or `TEST_EXTENDED_MODE=true`; off by default so `npx mgr test` stays fast + offline-safe. The command now prints `Test mode: extended (real external APIs)` / `normal (external APIs skipped)` and a `⚠️` warning when extended, and `process.env.TEST_EXTENDED_MODE` propagates to every spawned test environment (in-process Node runner + Puppeteer's Chromium). Tests gate on `process.env.TEST_EXTENDED_MODE`. New `src/test/utils/extended-mode-warning.js` (SSOT for the warning). See [docs/test-framework.md](docs/test-framework.md).

### Fixed

- **`logs/test.log` now captures the FULL run (createTee tee isolation).** The attach-log-file tee was a single process-wide singleton, so the attach-log-file unit test detached the live test.log tee mid-run and truncated the file to ~9 lines (header only). `src/utils/attach-log-file.js` now wraps its state in a `createTee()` factory (independent, stackable instances) with the production singleton built on top; the build-layer test (`src/test/suites/build/attach-log-file.test.js`) uses its own `attach.createTee()` instance per test, which stacks under the live singleton and restores it cleanly on detach. Mirrors EM's fix.

- **`npx mgr test <target>` now correctly scopes by source.** Previously the positional target was ignored and every run executed all suites (framework + project) regardless of the prefix. The target now selects which test FILES run: `project:` runs project tests only (`project:<path>` to narrow), `mgr:` / `bxm:` / `framework:` run framework tests only (`mgr:` is the universal cross-framework alias; `bxm:` / `framework:` are BXM-specific equivalents), and a bare `<path>` matches both sources by path. The `--filter=<substring>` flag is orthogonal — it matches test NAMES/descriptions within the already-selected files, and composes with the target. See [docs/test-framework.md](docs/test-framework.md).

---
## [1.5.0] - 2026-06-02

### Added

- **`test/_init.js` pre-test lifecycle hook.** The test runner loads an optional `test/_init.js` from BOTH test roots (framework + consumer project) and runs its `setup()` ONCE before any suite (it is not run as a test itself; the `_`-prefix keeps it out of discovery). The module **must export a function** — `module.exports = (ctx) => ({ setup })` — called with `{ projectRoot }`. There is no `cleanup` hook (tests clean up after themselves) and no `accounts` field (no auth/user system, unlike the backend framework). Mirrors the same hook across all four OMEGA frameworks. See [docs/test-framework.md](docs/test-framework.md).
- **Consumer-shipped defaults via `src/defaults/`** — a boilerplate `test/_init.js`, `CHANGELOG.md`, and `docs/` scaffold now ship to consumers on first setup (copied if absent, never overwriting an existing file).

### Changed

- **Environment detection consolidated onto `getEnvironment()` as SSOT** ([src/utils/mode-helpers.js](src/utils/mode-helpers.js)). `getEnvironment()` is the single reader of the raw signals (folding in the packaged-build signal) and returns exactly one of `development | testing | production` (mutually exclusive, testing wins); `isDevelopment`/`isProduction`/`isTesting` now DERIVE from it so they can never disagree. No-signal default is `development` (a deployed extension always carries its baked-in build signal). `getEnvironment` moved OUT of `build.js` to live WITH the `is*()` family in mode-helpers, and is mixed into all context Managers via `attachTo(Manager)`.
- **Install-command alias parity** ([src/commands/install.js](src/commands/install.js)) — accepts the unified set across all four frameworks (`dev|d|development|local|l` / `live|prod|p|production`); docs advertise the canonical `dev` + `live`.
- **Docs reorg** — `docs/cross-context-helpers.md` renamed to `docs/environment-detection.md` with a mirrored 9-section structure shared across BEM/EM/UJM/BXM; CLAUDE.md / README / managers / components docs updated to match.

---
## [1.4.0] - 2026-05-12

### Added

- **Three-layer test framework** (`build` / `page` / `boot`, 60 framework tests passing in ~4s). New under `src/test/`: `assert.js` (Jest-compatible matcher set), `runner.js` (discovery + dispatch + reporter), `index.js` (public API), `runners/{chromium,boot}.js` (Puppeteer launchers), `harness/extension/` (stub MV3 extension), `fixtures/consumer-extension/` (fresh-built dist/ for framework boot tests). Consumer-test discovery uses the `isFrameworkSelfTest` package-name check to scope framework `boot/` suites to BXM's own runs.
- **`test` CLI command + `--test` alias** ([src/commands/test.js](src/commands/test.js)). Sets `BXM_TEST_MODE=true`, auto-routes UJM/EM-style `BXM_TEST_BOOT_PROJECT` to the fixture when BXM tests itself. `npm test` script + projectScripts entry so consumers get `"test": "npx mgr test"` on next setup.
- **`src/utils/mode-helpers.js`** — `attachTo(Manager)` mixin exposing `isTesting`/`isDevelopment`/`isProduction`/`getVersion`. Wired into all 8 context Managers ([src/build.js](src/build.js), [src/background.js](src/background.js), [src/popup.js](src/popup.js), [src/options.js](src/options.js), [src/sidepanel.js](src/sidepanel.js), [src/content.js](src/content.js), [src/page.js](src/page.js), [src/offscreen.js](src/offscreen.js)). Driven by `BXM_TEST_MODE` env in Node + `globalThis.BXM_TEST_MODE` in extension contexts.
- **`puppeteer` devDep** — peer-optional for consumers (only needed if they write `page`/`boot` tests; `build` layer needs nothing extra).
- **16 new `docs/<topic>.md` deep references** migrated out of the previous monolithic CLAUDE.md: test-framework, test-boot-layer, cross-context-helpers, components, managers, build-system, themes, css, extension, auth, hooks, cli, translations, publishing, defaults, templating.
- **Consumer-shipped `src/defaults/CLAUDE.md`** with `# ========== Default Values ==========` / `# ========== Custom Values ==========` markers. Framework section stays live-synced across `npx mgr setup` while the Custom section is preserved verbatim — same merge protocol as `.env`/`.gitignore`.
- **`'CLAUDE.md'` FILE_MAP rule** ([src/gulp/tasks/defaults.js](src/gulp/tasks/defaults.js)) with `mergeLines: true` — positioned after the `'**/*.md'` catch-all so the last-match-wins logic in `getFileOptions` activates the merge path.

### Changed

- **CLAUDE.md reorganized from 818 to 201 lines** as a TOC hub with one-paragraph-per-subsystem and cross-links to `docs/<topic>.md`. Added the contributor note that meat belongs in `docs/`, not inline.
- **README.md updated** with a Testing section (4-layer overview + example test files) and a Sister Projects callout.

### Fixed

- **`mergeLineBasedFiles` idempotency bug** — the inline merge function unconditionally inserted a blank line before `CUSTOM_SECTION_MARKER`, causing first-merge after a fresh `jetpack.copy` to grow the file by one newline. Now skips the insert if `mergedDefaultSection` already ends blank. Affects `.env`/`.gitignore`/`CLAUDE.md` equally — first-merge is now a true no-op.

---
## [1.3.49] - 2026-05-10
### Removed
- `through2` dependency. Replaced with native `node:stream` `Transform` across 4 gulp task files (`defaults.js`, `distribute.js`, `html.js`, `utils/template-transform.js`). through2@5 became ESM-only with no `require` condition in its exports, breaking CJS require; the built-in `Transform` is a drop-in replacement

### Changed
- Bumped `@anthropic-ai/claude-agent-sdk` from ^0.2.90 to ^0.2.138
- Bumped `@babel/preset-env` from ^7.29.2 to ^7.29.5
- Bumped `dotenv` from ^17.4.0 to ^17.4.2
- Bumped `gulp-filter` from ^9.0.1 to ^10.0.0
- Bumped `sass` from ^1.98.0 to ^1.99.0
- Bumped `web-manager` from ^4.1.36 to ^4.1.41
- Bumped `webpack` from ^5.105.4 to ^5.106.2
- Bumped `wonderful-fetch` from ^2.0.4 to ^2.0.5
- Bumped `prepare-package` from ^2.0.7 to ^2.1.0

---
## [1.3.48] - 2026-04-02
### Changed
- Replaced `.npmignore` with `files` field in package.json for safer npm publish allowlist
- Bumped `web-manager` from ^4.1.33 to ^4.1.36

### Removed
- `.npmignore` file (superseded by `files` field)

## [1.3.46] - 2026-04-02
### Changed
- Switched web-manager to singleton import across all context managers (popup, options, sidepanel, page)
- Web Manager instance is now assigned in constructor instead of creating a new instance during `initialize()`

## [1.3.44] - 2026-04-01
### Changed
- Bumped `@anthropic-ai/claude-agent-sdk` from ^0.2.76 to ^0.2.90
- Bumped `@babel/preset-env` from ^7.29.0 to ^7.29.2
- Bumped `dotenv` from ^17.3.1 to ^17.4.0
- Bumped `lodash` from ^4.17.23 to ^4.18.1
- Bumped `minimatch` from ^10.2.4 to ^10.2.5
- Bumped `web-manager` from ^4.1.28 to ^4.1.33
- Bumped `ws` from ^8.19.0 to ^8.20.0

## [1.3.43] - 2026-03-16
### Added
- Set `private: true` on consuming projects during setup to prevent accidental npm publishes

## [1.3.42] - 2026-03-15
### Changed
- Bumped `node-powertools` from ^2.3.2 to ^3.0.0
- Bumped `wonderful-fetch` from ^1.3.4 to ^2.0.4
- Bumped `web-manager` from ^4.1.27 to ^4.1.28
- Bumped `prepare-package` from ^1.2.6 to ^2.0.7
- Added `preparePackage.type: "copy"` config to package.json

## [1.3.40] - 2026-03-14
### Changed
- Migrated `app` references to `brand` namespace (`this.app` → `this.brand.id`, `options.app.id` → `options.brand.id`)
- Nested brand image properties under `brand.images.*` (`brandmark`, `wordmark`, `combomark`)

## [1.3.17] - 2025-12-23
### Changed
- Auth system now uses messaging instead of `chrome.storage` for cross-context sync
- Background.js is the source of truth; contexts sync via `bxm:syncAuth` message on load
- Fresh custom tokens fetched from server only when context UID differs from background UID

### Fixed
- Auth failures caused by expired custom tokens (tokens no longer stored, fetched fresh when needed)

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

### Fixed
- Packaged extensions no longer include `.scss`, `.sass`, `.ts`, or `.DS_Store` files (caused store rejections)

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
