# ========== Default Values ==========
# Browser Extension Manager (BXM) — consumer project

> **Auto-managed file.** Everything between `# ========== Default Values ==========` and `# ========== Custom Values ==========` is owned by `browser-extension-manager` and rewritten on every `npx mgr setup`. Put your own project-specific notes BELOW the `Custom Values` marker — that section is preserved verbatim across setups.

## Framework

This project consumes **Browser Extension Manager** (BXM) — a comprehensive framework for building modern cross-browser extensions (Chrome, Firefox, Edge, Opera, Brave). BXM provides one-line bootstrap per extension context, a component-based architecture (view + styles + script per context), a multi-browser build/release pipeline that produces store-uploadable zips, cross-context auth synchronization, and a built-in four-layer test framework.

**Framework's own docs** (read these for deep-dives; both paths point to the same files, the absolute path works regardless of working directory):
- Top-level overview: `/Users/ian/Developer/Repositories/ITW-Creative-Works/browser-extension-manager/CLAUDE.md` (or `node_modules/browser-extension-manager/CLAUDE.md`)
- Subsystem references: `/Users/ian/Developer/Repositories/ITW-Creative-Works/browser-extension-manager/docs/` (or `node_modules/browser-extension-manager/docs/`)

## Quick start

```bash
npm start                   # dev with live reload (gulp → webpack → serve)
npm run build               # production build → dist/ + packaged/<browser>/raw/ + .zip per browser
BXM_IS_PUBLISH=true npm run build   # build + auto-upload to Chrome / Firefox / Edge stores
npx mgr test                # run framework + project test suites
```

Load the unpacked extension in Chrome: point chrome://extensions → "Load unpacked" at `packaged/chromium/raw/`.

## Where things live

- `config/browser-extension-manager.json` — JSON5 config: brand, manifest overrides, build settings, theme. `Manager.getConfig()` reads this.
- `config/messages.json` — i18n source. Auto-translated to 16 languages at build time via the Claude CLI (only missing keys regenerated).
- `config/description.md` — store-listing description (used by the publish step).
- `src/manifest.json` — extension manifest. BXM merges its defaults in at build time; you only need to declare what's specific to your extension.
- `src/views/<context>/index.html` — per-context HTML (popup / options / sidepanel / pages).
- `src/assets/js/components/<context>/index.js` — per-context script entry. One-line bootstrap of `browser-extension-manager/<context>`.
- `src/assets/css/components/<context>/index.scss` — per-context styles.
- `src/assets/js/components/background.js` — MV3 service worker entry. Source of truth for auth + messaging.
- `src/_locales/en/messages.json` — Chrome `__MSG_*__` placeholders (auto-translated to 16 langs at build).
- `hooks/build/{pre,post}.js` — optional lifecycle hooks.
- `test/**/*.js` — your project test suites (framework auto-runs them alongside its own).

## Per-context imports

```js
// src/assets/js/components/popup/index.js
import Manager from 'browser-extension-manager/popup';
await new Manager().initialize();

// src/assets/js/components/background.js  (service worker)
import Manager from 'browser-extension-manager/background';
await new Manager().initialize();

// Same shape for options / sidepanel / content / page / offscreen
```

## Available APIs at runtime

After `initialize()`, every Manager exposes:
- `manager.extension` — cross-browser `chrome.*` / `browser.*` / `window.*` wrapper
- `manager.logger` — timestamped per-context logger
- `manager.webManager` — Web Manager singleton (Firebase, auth, analytics, reactive `data-wm-bind` directives)
- `manager.messenger` — `chrome.runtime.onMessage` listener wired automatically
- `manager.isDevelopment()` / `isProduction()` / `isTesting()` / `getVersion()` — cross-context helpers

Auth UI is declarative — add `.auth-signin-btn` / `.auth-signout-btn` / `.auth-account-btn` to buttons; BXM wires them. Show/hide based on auth state via `data-wm-bind="@show auth.user"`.

# ========== Custom Values ==========

## Project-specific notes

Add anything specific to THIS project here. Edits below this line are preserved across `npx mgr setup` runs.
