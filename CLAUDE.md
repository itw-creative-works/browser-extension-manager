# Browser Extension Manager (BXM)

> **Note for contributors and Claude:** This file is the architectural overview — identity, top-level conventions, and a map to deep references. The **meat** (per-subsystem APIs, edge cases, behavior tables, defaults lists) lives in `docs/<topic>.md`. When extending or adding content, write it in the matching `docs/*.md` file and cross-link from here — do NOT inline it. If a topic doesn't have a doc yet, create one. Goal: keep this file under 250 lines.

## Identity

Browser Extension Manager (BXM) is a comprehensive framework for building modern cross-browser extensions (Chrome, Firefox, Edge, Opera, Brave). Sister project to Electron Manager (EM) and Ultimate Jekyll Manager (UJM). Provides one-line-import bootstrap per extension context, a component-based architecture, a multi-browser build/release pipeline, auto-translation across 16 languages, cross-context auth synchronization, and a built-in four-layer test framework.

## Recommended skills

- **`BXM:patterns`** — SSOT for Browser Extension Manager component architecture, build system, and development patterns. Auto-loads on BXM-specific keywords (`manifest.json`, `extension popup`, `extension background`, `offscreen document`, `chrome extension`, etc.) and when touching files in `src/assets/js/components/`, `src/views/`, `src/assets/css/components/`, `config/browser-extension-manager.json`.
- **`js:patterns`** — JavaScript/Node.js conventions: file structure, JSDoc, defensive coding (`?.` usage), template literals, `package.json` conventions. Auto-loads when creating new `.js` files or touching JS module structure.

## 🚨 READ WEB-MANAGER TOO

**BXM ships `web-manager` as a runtime singleton across every extension context** (background service worker, popup, options, sidepanel, content scripts) — it powers auth, Firebase, reactive `data-wm-bind` directives, analytics, error tracking, and utilities (`escapeHTML`, etc.). Any task that touches auth flows, Firestore reads/writes, subscription resolution, push notifications, or DOM bindings means you are working with web-manager as much as with BXM.

**Required reading:**
- **`node_modules/web-manager/CLAUDE.md`** — top-level overview + index
- **`node_modules/web-manager/docs/`** — module deep references (Auth, Bindings, Firestore, Notifications, etc.)

## Quick Start

### For Consuming Projects

1. `npm install browser-extension-manager --save-dev`
2. `npx bxm setup` — scaffolds the project (copies `src/defaults/` into the project: `src/manifest.json`, `src/views/`, `src/assets/`, `config/browser-extension-manager.json`, etc.)
3. `npm start` — dev (gulp → webpack → serve with live reload)
4. `npm run build` — production build (compiles `dist/`, packages per-browser into `packaged/<browser>/raw/` + `.zip`)
5. `BXM_IS_PUBLISH=true npm run build` — also uploads to Chrome / Firefox / Edge stores (see [docs/publishing.md](docs/publishing.md))
6. `npx bxm test` — runs framework + project test suites
   - `npx mgr test build/config` — run a specific test by path (relative to `test/`)
   - `npx mgr test bxm:build/config` — run only framework tests matching a path
   - `npx mgr test project:custom-test` — run only consumer project tests matching a path
   - Prefix with `TEST_EXTENDED_MODE=true` for tests that hit real external APIs

To load the unpacked extension in Chrome: point chrome://extensions → "Load unpacked" at `packaged/chromium/raw/`.

### For Framework Development (This Repository)

1. `npm install`
2. `npm start` — watch + compile `src/` → `dist/` via prepare-package
3. Test in a consumer project: from inside the consumer, run `npx mgr install dev` to swap BXM to this local repo — required whenever you edit the framework source and want the consumer to pick up the changes (the consumer otherwise keeps its installed `node_modules/browser-extension-manager`). Reverse with `npx mgr install live`.
4. `npm test` — runs the framework's own suites

## Architecture

### Per-context Manager singletons

Each extension context has its own one-line bootstrap. Eight contexts total — see [docs/managers.md](docs/managers.md):

```js
// src/assets/js/components/popup/index.js
import Manager from 'browser-extension-manager/popup';
await new Manager().initialize();

// src/assets/js/components/background.js  (service worker)
import Manager from 'browser-extension-manager/background';
await new Manager().initialize();

// Same shape for options / sidepanel / content / page / offscreen
```

After `initialize()`, the Manager exposes:
- `manager.extension` — cross-browser `chrome.*` / `browser.*` / `window.*` API wrapper ([docs/extension.md](docs/extension.md))
- `manager.logger` — timestamped per-context logger
- `manager.webManager` — Web Manager singleton (Firebase, auth, analytics, reactive bindings)
- `manager.messenger` — `chrome.runtime.onMessage` listener wired automatically
- `manager.isDevelopment() / isProduction() / isTesting() / getVersion()` — cross-context helpers ([docs/environment-detection.md](docs/environment-detection.md))

### Component architecture

Extensions are organized around **components** — each a browser-extension context bundling a view, styles, and a script. Seven contexts × three parts each:

| Component | Runs in | When |
|---|---|---|
| `background` | MV3 service worker | Always — source of truth for auth + messaging |
| `popup` | Browser-action popup | When the user clicks the toolbar button |
| `options` | Standalone tab | When the user opens settings |
| `sidepanel` | Chrome side panel (114+) | When the user opens the side panel |
| `content` | Each visited web page | Injected by manifest `content_scripts` |
| `pages` | Custom extension page (dashboard, welcome) | Routed via `chrome.tabs.create` |
| `offscreen` | Offscreen document (Chrome 109+) | For WebSocket, DOM parsing, long-running SW-adjacent tasks |

Each component has three parts at conventional paths:
- View: `src/views/<component>/index.html`
- Styles: `src/assets/css/components/<component>/index.scss`
- Script: `src/assets/js/components/<component>/index.js`

Compiled output: `dist/views/<component>/index.html`, `dist/assets/css/components/<component>.bundle.css`, `dist/assets/js/components/<component>.bundle.js`. See [docs/components.md](docs/components.md).

### Cross-context auth sync

Background.js is the source of truth for authentication. Other contexts compare their UID with background's on load and sync up — sign-ins / sign-outs broadcast across all open contexts via `chrome.runtime` messaging. No `chrome.storage` involved; Firebase persists per-context sessions in IndexedDB.

Three flows: sign-in (website `/token` redirect → broadcast), context-load (`bxm:syncAuth`), sign-out (`bxm:signOut` broadcast). Auth-button CSS classes (`.auth-signin-btn`, `.auth-signout-btn`, `.auth-account-btn`) wire UI without writing JS. Web-Manager reactive bindings (`data-wm-bind="@show auth.user"`) handle DOM state.

Required setup: `firebaseConfig.authDomain` in config, `tabs` permission in manifest. See [docs/auth.md](docs/auth.md).

### Build system

`src/` (consumer) → `dist/` (intermediate, JSON5 manifest) → `packaged/<browser>/raw/` (strict-JSON manifest, Chrome-loadable) → `packaged/<browser>/<name>.zip` (store upload).

- **Gulp** auto-loads tasks from `src/gulp/tasks/` via `src/gulp/main.js`. Tasks: `defaults`, `distribute`, `sass`, `webpack`, `html`, `icons`, `translate`, `package`, `serve`, `audit`.
- **Webpack** — bundles each `src/assets/js/components/<name>/index.js` with Babel transpilation. Custom `__theme__` alias resolves to the active theme. Template-replacement plugin substitutes `%%% version %%%` / `%%% brand.name %%%` / etc.
- **Sass** — load-path resolution lets consumer SCSS `@use 'browser-extension-manager'` / `@use 'theme'` / `@use 'components/popup'` without long relative paths. See [docs/css.md](docs/css.md).
- **HTML templating** — two-pass `{{ }}` replacement: view first, then outer page-template. Vars: `brand.name`, `brand.url`, `page.title`, `theme.appearance`, `version`, `cacheBust`. See [docs/templating.md](docs/templating.md).
- **Packaging** ([gulp/package.js](src/gulp/tasks/package.js)) — per-browser manifest normalization (JSON5 → strict JSON), zip, optional auto-publish.

See [docs/build-system.md](docs/build-system.md).

### Build modes

- `BXM_BUILD_MODE=true` — production build (minified, no sourcemaps, dev-blocks stripped)
- `BXM_IS_PUBLISH=true` — also publish to Chrome / Firefox / Edge stores after packaging
- `BXM_TEST_MODE=true` — running inside BXM's test framework. Powers `Manager.isTesting()`.
- `BXM_LIVERELOAD_PORT=35729` — WebSocket port for `serve` task

### Themes

Two themes ship with BXM: `bootstrap` (pure Bootstrap 5.3+) and `classy` (Bootstrap + custom design system). Plus `_template/` for new themes. Activate via `config.theme.id`; appearance via `config.theme.appearance` ('dark' / 'light'). Variables overridable from consumer SCSS via `@use 'browser-extension-manager' as * with ($primary: …)`. See [docs/themes.md](docs/themes.md).

### Defaults system

`src/defaults/` is the starter template — copied to consumer projects on `npx bxm setup`. File behavior (overwrite/skip/template/rename) is controlled by `FILE_MAP` in [gulp/tasks/defaults.js](src/gulp/tasks/defaults.js). Most consumer files default to `overwrite: false` so user code is never clobbered. See [docs/defaults.md](docs/defaults.md).

### Auto-translation

`npm run build` invokes the `translate` gulp task: reads `src/_locales/en/messages.json`, finds keys missing from the other 16 locales, fills them via Claude CLI. Existing translations are preserved. Languages: `zh es hi ar pt ru ja de fr ko ur id bn tl vi it`. See [docs/translations.md](docs/translations.md).

### Build hooks

Two lifecycle hooks let consumers run custom logic during packaging:
- `hooks/build:pre.js` — after `dist/` is built but before `packaged/` is assembled
- `hooks/build:post.js` — after packaging (and after store publishing if `BXM_IS_PUBLISH=true`)

Both receive an `index` build-info object (package, manifest, config, paths, env). Async. See [docs/hooks.md](docs/hooks.md).

### Cross-context helpers

Every Manager (build + 7 runtime contexts) has the same set of static + instance helpers via `attachTo(Manager)` mixin from `src/utils/mode-helpers.js`:

- `Manager.isDevelopment()` — running unpacked, and NOT testing
- `Manager.isTesting()` — `BXM_TEST_MODE=true` (takes precedence over development)
- `Manager.isProduction()` — running packed (from store), and NOT testing. A real positive check, NOT `!isDevelopment()`
- `Manager.getEnvironment()` — `'development' | 'testing' | 'production'` (mutually exclusive; testing wins)
- `Manager.getVersion()` — extension version (`chrome.runtime.getManifest().version` in browser, `package.json#version` in Node)

The three environment checks are mutually exclusive. Gate side effects on the INTENTIONAL check (`isProduction()` for prod-only, `isDevelopment() || isTesting()` for local-or-test) — never `!isDevelopment()`. Use these instead of grepping `process.env` ad-hoc. See [docs/environment-detection.md](docs/environment-detection.md).

### Test framework

`npx bxm test` discovers + runs:
- `<BXM>/dist/test/suites/**/*.js` — framework defaults
- `<cwd>/test/**/*.js` — consumer suites

Four layers:
- **build** — plain Node, fast. Manager API, config validation, manifest shape, lib utilities.
- **background** — real MV3 service worker via Puppeteer + CDP. Boot sequence, `chrome.runtime` surface, storage round-trips, messaging.
- **view** — Chromium tab loading harness `popup.html` / `options.html` / `sidepanel.html`. DOM bindings, Manager surface, popup ↔ background messaging.
- **boot** — real headless Chromium loading the **consumer's** `packaged/<browser>/raw/` as an unpacked extension. End-to-end: does the real packaged extension boot?

Test files export `{ type, layer, description, tests, cleanup }` with `run` (build/background/view) or `inspect` (boot). Same `ctx.expect` / `state` / `skip` API as EM and BEM. CSP-safe ([docs/test-framework.md](docs/test-framework.md)) — test bodies are inlined as literal async-function expressions at runner build-time, not eval'd inside the SW.

**NEVER mock — test against the real harness.** Every layer gives you the real runtime (real MV3 SW, real Chromium tab + DOM, real packaged extension), so never hand-roll a `mockManager`, fake `chrome`/`browser`, or stubbed context. Only pure functions (zero I/O) are called directly. Real external APIs (Firebase, etc.) are GATED behind `npx bxm test --integration` — normal mode skips them in-source via `ctx.skip`, NOT mocked; integration-mode tests must clean up anything they create externally. See [docs/test-framework.md](docs/test-framework.md).

See [docs/test-framework.md](docs/test-framework.md) and [docs/test-boot-layer.md](docs/test-boot-layer.md).

## CLI

`npx bxm <command>` (aliases `xm`, `ext`, `mgr`, `browser-extension-manager`):

| Command | Description |
|---|---|
| `setup` | scaffold consumer, copy `src/defaults/`, ensure peer deps. Default when no command given. |
| `clean` | remove `dist/`, `packaged/`, `.cache/`, `.temp/` |
| `install` | install peer deps |
| `version` | print versions |
| `test` | run framework + project test suites |

See [docs/cli.md](docs/cli.md).

## Dependency Resolution

- **Consumer code can `require()` any BXM dependency** — webpack's `resolve.modules` includes the framework's own `node_modules/`. Consumer projects do NOT need to `npm install firebase`, `web-manager`, or any other BXM transitive dep. If a dep doesn't resolve, the fix is in BXM's webpack config — not the consumer's `package.json`.
- **web-manager owns Firebase.** Consumer code NEVER imports Firebase directly (`require('firebase')` / `import('firebase/app')`). Use `import webManager from 'web-manager'` → `webManager.auth()`, `webManager.firestore()`. Same rule in EM and UJM.
- **`Manager.require(name)`** resolves from BXM's module context at runtime (static + prototype). Use in gulp tasks or unbundled code (e.g. test fixtures). Webpack `resolve.modules` handles the bundled case.

## Development Workflow

- **🚫 NEVER run `npm start` / `npm run build` / `npm test`** unless the user explicitly asks. Assume the user is already running the dev server or build watcher. Running these commands kills the user's process and wastes time. Instead, **check output logs** after editing files to confirm changes compiled and took effect.
- **After editing files**, verify the gulp watcher recompiled successfully. Check for webpack/sass errors in the console output. A change that breaks the build is not a completed change.
- **Live-test UI changes via CDP.** After code changes compile, use the `chrome-devtools` MCP tools (screenshots, click, evaluate JS, console logs) to verify the change works in the running browser. This is the primary way to confirm UI changes — type-checking and test suites verify code correctness, not feature correctness. See `~/.claude/mcp-server/servers/chrome-devtools/CLAUDE.md`.

## File Conventions

- **CommonJS** (`require()`) for build-time + Node code (gulp, CLI, tests). **ES modules** (`import`/`export default class`) for browser-context Manager files (`background.js`, `popup.js`, etc.) — they go through webpack/Babel.
- One `module.exports = ...` per file (CommonJS).
- Logical operators at the **start** of continuation lines.
- Short-circuit early returns rather than nested ifs.
- Prefer **`fs-jetpack`** over `fs-extra`.
- **No backwards compatibility** unless explicitly requested.
- **No paranoid `?.`** — see [the defensive-coding rule](https://anthropic.com/claude-code) (also enforced in `~/.claude/skills/js:patterns`). Framework internals deref directly; `?.` is for genuinely-uncertain values (user config sub-fields, `chrome.*` APIs that may be absent, regex matches, caught exceptions).
- **Browser-context modules are ES-module.** Webpack compiles them. Don't try to `require()` them from Node — they reference `window`, `document`, `chrome` at module-load time. Build-layer tests should target `lib/*.js` (Node-safe) or use BXM's public Manager API (`require('browser-extension-manager/build').getConfig()`).
- **Consumer pattern: use the public Manager API in tests.** Don't `require('json5')` or other transitive BXM deps directly from consumer test files — they're not in the consumer's `package.json` and resolution is fragile. Use `Manager.getConfig()` / `Manager.getManifest()` / `Manager.require('json5')`.

## Doc-update parity

Whenever you make a behavioral change (new command, new flag, new pattern, removed feature), update:

1. **`README.md`** — user-facing summary
2. **`CLAUDE.md`** (this file) — architecture overview, one paragraph or cross-link
3. **`docs/<topic>.md`** — the meat. If a topic doesn't have a doc yet, create one.
4. **`CHANGELOG.md`** — if the project keeps one

Don't ship behavioral changes with stale docs. Validate first, then document — write docs that describe shipped reality, not intentions.

## Documentation

API references for each subsystem live in `docs/`:

### Architecture
- [docs/components.md](docs/components.md) — seven component contexts, three-part structure (view + styles + script)
- [docs/managers.md](docs/managers.md) — one-line bootstrap per context, import paths, `initialize()` flow
- [docs/environment-detection.md](docs/environment-detection.md) — `Manager.isTesting / isDevelopment / isProduction / getVersion`

### Runtime
- [docs/extension.md](docs/extension.md) — cross-browser `chrome.*` / `browser.*` API wrapper
- [docs/auth.md](docs/auth.md) — cross-context auth sync, sign-in / load / sign-out flows, button CSS classes

### Build
- [docs/build-system.md](docs/build-system.md) — gulp pipeline, webpack, sass, html, packaging
- [docs/templating.md](docs/templating.md) — `{{ }}` token replacement, available vars, page template
- [docs/css.md](docs/css.md) — SCSS load paths, framework + theme + project resolution
- [docs/themes.md](docs/themes.md) — bootstrap / classy / `_template`, variable overrides, dark mode
- [docs/defaults.md](docs/defaults.md) — `src/defaults/` system, `FILE_MAP` rules
- [docs/hooks.md](docs/hooks.md) — `build:pre` / `build:post` lifecycle hooks
- [docs/translations.md](docs/translations.md) — Claude CLI auto-translate to 16 languages

### Operations
- [docs/cli.md](docs/cli.md) — commands, aliases, env var conventions
- [docs/publishing.md](docs/publishing.md) — Chrome / Firefox / Edge store auto-publishing, credentials, CI

### Testing
- [docs/test-framework.md](docs/test-framework.md) — writing tests, four layers, `ctx` + `expect` API
- [docs/test-boot-layer.md](docs/test-boot-layer.md) — boot layer (loads consumer's actual packaged extension)
