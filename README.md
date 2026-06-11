<p align="center">
  <a href="https://itwcreativeworks.com">
    <img src="https://cdn.itwcreativeworks.com/assets/itw-creative-works/images/logo/itw-creative-works-brandmark-black-x.svg" width="100px">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/itw-creative-works/browser-extension-manager.svg">
  <br>
  <img src="https://img.shields.io/librariesio/release/npm/browser-extension-manager.svg">
  <img src="https://img.shields.io/bundlephobia/min/browser-extension-manager.svg">
  <img src="https://img.shields.io/npm/dm/browser-extension-manager.svg">
  <img src="https://img.shields.io/node/v/browser-extension-manager.svg">
  <img src="https://img.shields.io/github/license/itw-creative-works/browser-extension-manager.svg">
  <img src="https://img.shields.io/github/contributors/itw-creative-works/browser-extension-manager.svg">
  <img src="https://img.shields.io/github/last-commit/itw-creative-works/browser-extension-manager.svg">
  <br>
  <br>
  <a href="https://itwcreativeworks.com">Site</a> | <a href="https://www.npmjs.com/package/browser-extension-manager">NPM Module</a> | <a href="https://github.com/itw-creative-works/browser-extension-manager">GitHub Repo</a>
  <br>
  <br>
  <strong>Browser Extension Manager</strong> is a framework for building modern cross-browser extensions. One-line bootstrap per context, component-based architecture, multi-browser build pipeline, cross-context auth, auto-translation across 16 languages, and a four-layer test framework.
</p>

## 🦄 Features

- **Build for any browser**: Chrome, Firefox, Edge, Opera, Brave
- **Component architecture**: seven contexts (background / popup / options / sidepanel / content / pages / offscreen) each with view + styles + script
- **One-line bootstrap per context** with cross-browser API wrapper
- **Cross-context auth sync**: sign-in in one tab is reflected in all open contexts (no `chrome.storage` needed)
- **Auto-translation** to 16 languages via Claude CLI on every build
- **Four-layer test framework**: build / background / view / boot — real Chromium, real MV3 service worker, real consumer extensions
- **Multi-browser packaging + auto-publish** to Chrome / Firefox / Edge stores from one command
- **Theme system**: Bootstrap 5 + Classy (custom design system), or roll your own
- **SCSS load paths**: `@use 'browser-extension-manager'` / `@use 'theme'` Just Work — no relative-path hell

## 🚀 Getting started

1. [Create a repo](https://github.com/itw-creative-works/ultimate-browser-extension/generate) from the **Ultimate Browser Extension** template (or `npm i browser-extension-manager` in an existing project).
2. Clone the repo to your local machine.
3. Set up + run:
   ```bash
   npm install
   npx bxm setup
   npm start
   ```
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `packaged/chromium/raw` folder in your project.
7. Your extension is loaded and live-reloads on source changes.

## 📦 Sync with the template

Run `npx bxm setup` again to pull the latest framework defaults. Files you've edited are preserved; only missing or framework-owned files update.

## 🧪 Testing

BXM ships a built-in four-layer test framework. Write tests under `test/<layer>/*.test.js` and run with:

```bash
npx bxm test                   # all layers
npx bxm test --layer build     # build layer only (plain Node, fast)
npx bxm test --layer boot      # real-Chromium end-to-end test
npx bxm test project:          # ONLY your project's tests (mgr: → only framework tests)
npx bxm test --extended        # also run extended suites against REAL external services (Firebase, etc.)
```

Tests run against the **real** harness — a real MV3 service worker, a real Chromium tab, the real packaged extension. **Never mock** (`chrome`, the Manager, contexts are all real); only pure, I/O-free functions are called directly. Real external APIs are gated behind **extended mode** — `--extended` or the shared, unprefixed `TEST_EXTENDED_MODE=true` env var (skipped in-source otherwise, never mocked).

All CLI output also lands in `logs/` (ANSI-stripped, truncated each run) — `test.log` from `npx bxm test`, `dev.log` from `npm start`, `build.log` from `npm run build`. Details: [docs/logging.md](docs/logging.md).

Test files use Jest-compatible matchers:

```js
// test/build/manifest.test.js
const Manager = require('browser-extension-manager/build');

module.exports = {
  layer: 'build',
  description: 'manifest is valid MV3',
  run: (ctx) => {
    const m = Manager.getManifest();
    ctx.expect(m.manifest_version).toBe(3);
    ctx.expect(m.permissions).toContain('storage');
  },
};
```

Full guide: [docs/test-framework.md](docs/test-framework.md). End-to-end "did my packaged extension actually boot in Chrome?" tests: [docs/test-boot-layer.md](docs/test-boot-layer.md).

## 🌐 Auto-translation

When you run `npm run build`, BXM auto-translates `src/_locales/en/messages.json` to 16 languages via Claude CLI:

`zh`, `es`, `hi`, `ar`, `pt`, `ru`, `ja`, `de`, `fr`, `ko`, `ur`, `id`, `bn`, `tl`, `vi`, `it`

Only missing translations are generated — existing translations are preserved. Full guide: [docs/translations.md](docs/translations.md).

## 🌎 Publishing your extension

### Manual upload

```bash
npm run build
```

Upload the `.zip` files under `packaged/<browser>/` to each browser's extension store.

### Automatic publishing

```bash
BXM_IS_PUBLISH=true npm run build
```

Add store credentials to your `.env`:

```bash
# Chrome Web Store
CHROME_EXTENSION_ID="..."
CHROME_CLIENT_ID="..."
CHROME_CLIENT_SECRET="..."
CHROME_REFRESH_TOKEN="..."

# Firefox Add-ons
FIREFOX_EXTENSION_ID="..."
FIREFOX_API_KEY="..."
FIREFOX_API_SECRET="..."

# Microsoft Edge Add-ons
EDGE_PRODUCT_ID="..."
EDGE_CLIENT_ID="..."
EDGE_API_KEY="..."
```

Only stores with configured credentials get published to. Full guide: [docs/publishing.md](docs/publishing.md).

## 🔐 Authentication

BXM provides built-in cross-context authentication that syncs across all extension contexts (popup, options, sidepanel, pages, background) without using `chrome.storage`.

**Background.js is the source of truth.** Auth syncs via messaging — sign-in / sign-out events propagate across all open contexts, and new contexts handshake with background on load.

### Setup

1. Add `authDomain` to your Firebase config in `config/browser-extension-manager.json`
2. Add `tabs` permission to `src/manifest.json`

### Auth button classes

Add these CSS classes to HTML elements for declarative auth UI:

| Class | Action |
|---|---|
| `.auth-signin-btn` | Opens `/token` page on your website |
| `.auth-signout-btn` | Signs out via Web Manager (broadcasts to all contexts) |
| `.auth-account-btn` | Opens `/account` page on your website |

```html
<button class="btn auth-signin-btn" data-wm-bind="@show !auth.user">Sign In</button>

<div data-wm-bind="@show auth.user" hidden>
  <img data-wm-bind="@attr src auth.user.photoURL">
  <span data-wm-bind="@text auth.user.displayName">User</span>
  <button class="auth-signout-btn">Sign Out</button>
</div>
```

Full guide: [docs/auth.md](docs/auth.md).

## 📚 Documentation

In-depth docs for every subsystem live in [docs/](docs/). See [CLAUDE.md](CLAUDE.md) for the architecture overview + table of contents.

## 🧰 Sister projects

- [Electron Manager (EM)](https://github.com/itw-creative-works/electron-manager) — same patterns, but for Electron desktop apps
- [Ultimate Jekyll Manager (UJM)](https://github.com/itw-creative-works/ultimate-jekyll-manager) — Jekyll static-site framework
- [Backend Manager (BEM)](https://github.com/itw-creative-works/backend-manager) — Firebase Functions backend framework
