# Build System

BXM uses **gulp + webpack + sass + custom HTML templating + an electron-builder-style packaging step** to compile extension source into a Chrome-loadable, multi-browser-ready build.

## Pipeline overview

`src/` (consumer authored) → `dist/` (intermediate) → `packaged/<browser>/raw/` (Chrome-loadable) → `packaged/<browser>/<name>.zip` (store upload).

```
src/
├── manifest.json                            # JSON5 source — comments, single quotes OK
├── views/<component>/index.html             # HTML templates
├── _locales/en/messages.json                # i18n catalog source
├── assets/
│   ├── js/components/<component>/index.js   # entry points (webpack bundles these)
│   ├── css/main.scss + components/          # SCSS
│   └── images/icon.png                      # source icon (1024×1024)
└── ...
        ↓ gulp build (BXM_BUILD_MODE=true)
dist/
├── manifest.json                            # still JSON5 — used by serve, not Chrome
├── views/<component>/index.html             # templated
├── assets/
│   ├── js/components/<component>.bundle.js  # webpack output
│   ├── css/components/<component>.bundle.css # sass output
│   └── images/                              # icons (multiple sizes)
└── _locales/<lang>/messages.json            # auto-translated (see docs/translations.md)
        ↓ packaging step
packaged/
├── chromium/
│   ├── raw/                                 # strict-JSON manifest, Chrome-loadable
│   │   ├── manifest.json                    # comments stripped, valid JSON
│   │   └── ...                              # everything from dist/
│   └── <ExtensionName>.zip                  # store upload
├── firefox/raw/ + .zip
└── opera/raw/ + .zip
```

## Gulp tasks

Auto-loaded from [src/gulp/tasks/](../src/gulp/tasks/) via [src/gulp/main.js](../src/gulp/main.js).

| Task | Source | Purpose |
|---|---|---|
| `defaults` | [tasks/defaults.js](../src/gulp/tasks/defaults.js) | Copy framework defaults from `dist/defaults/` to consumer project on first run / setup. See [defaults.md](defaults.md). |
| `distribute` | [tasks/distribute.js](../src/gulp/tasks/distribute.js) | Copy consumer's `src/` files (HTML, manifest, locales, etc.) to `dist/` |
| `sass` | [tasks/sass.js](../src/gulp/tasks/sass.js) | Compile SCSS → CSS bundles with the load-path system (see [css.md](css.md)) |
| `webpack` | [tasks/webpack.js](../src/gulp/tasks/webpack.js) | Bundle JS per component entry point with Babel transpilation |
| `html` | [tasks/html.js](../src/gulp/tasks/html.js) | Run views through the two-step templating system (see [templating.md](templating.md)) |
| `icons` | [tasks/icons.js](../src/gulp/tasks/icons.js) | Generate icon variants from `src/assets/images/icon.png` |
| `translate` | [tasks/translate.js](../src/gulp/tasks/translate.js) | Auto-translate `_locales/en/messages.json` to 16 languages via Claude CLI (see [translations.md](translations.md)) |
| `package` | [tasks/package.js](../src/gulp/tasks/package.js) | Bundle dist/ into packaged/<browser>/raw + zip; runs `build:pre` / `build:post` hooks ([hooks.md](hooks.md)) |
| `serve` | [tasks/serve.js](../src/gulp/tasks/serve.js) | Dev server: WebSocket-based live reload, watches `src/` |
| `audit` | [tasks/audit.js](../src/gulp/tasks/audit.js) | Build-pipeline-specific checks (icons exist, manifest is valid, etc.) |

## Webpack

[src/gulp/tasks/webpack.js](../src/gulp/tasks/webpack.js) discovers component entry points (`src/assets/js/components/<name>/index.js`) and bundles each to `dist/assets/js/components/<name>.bundle.js`.

**Babel transpilation** — `@babel/preset-env` so the bundles work in older browsers. SW + content scripts have stricter constraints (no `eval`, no ES module syntax at top level in some configs).

**Template replacement** — a webpack plugin replaces these markers in bundles at build time:
- `%%% version %%%` → `package.json#version`
- `%%% brand.name %%%` → config brand name
- `%%% brand.url %%%` → config brand URL
- `%%% environment %%%` → `'production'` or `'development'`
- `%%% liveReloadPort %%%` → WebSocket port (35729 default)
- `%%% webManagerConfiguration %%%` → JSON config blob

**Strip-dev-blocks** — [src/gulp/plugins/webpack/strip-dev-blocks.js](../src/gulp/plugins/webpack/strip-dev-blocks.js) removes `/* dev */ ... /* /dev */` blocks from production bundles.

**Custom aliases** — set via `resolve.alias` in webpack.js:
```js
resolve: {
  alias: {
    '__theme__': path.resolve(paths.root, 'assets/themes/<active-theme>'),
  }
}
```

## Sass

[src/gulp/tasks/sass.js](../src/gulp/tasks/sass.js) compiles per-component SCSS bundles. Load-path resolution lets consumer SCSS `@use 'browser-extension-manager'`, `@use 'theme'`, and `@use 'components/popup'` resolve through a search chain. Full details in [css.md](css.md).

## HTML templating

Views in `src/views/<component>/index.html` go through two passes of `{{ }}` token replacement. See [templating.md](templating.md).

## Packaging

[tasks/package.js](../src/gulp/tasks/package.js):

1. **Pre-hook** — runs `hooks/build:pre.js` if present
2. **Per-browser manifest normalization** — converts JSON5 → strict JSON for Chrome/Edge/Opera (Firefox tolerates JSON5 but normalized anyway)
3. **Per-browser asset copy** to `packaged/<browser>/raw/`
4. **Zip** to `packaged/<browser>/<name>.zip`
5. **Post-hook** — runs `hooks/build:post.js`
6. **Auto-publish** (if `BXM_IS_PUBLISH=true`) — uploads to Chrome Web Store / Firefox Add-ons / Edge Add-ons stores. See [publishing.md](publishing.md).

## Build modes

Env vars that drive the pipeline:

- `BXM_BUILD_MODE=true` — production build (minified, no sourcemaps, dev-blocks stripped)
- `BXM_IS_PUBLISH=true` — also publish to extension stores after packaging
- `BXM_LIVERELOAD_PORT=35729` — WebSocket port for `serve` task (override if 35729 collides)
- `BXM_TEST_MODE=true` — running in BXM's test framework. Powers `Manager.isTesting()` (see [test-framework.md](test-framework.md)).

## Live reload

`npm start` (= `gulp` with no args, by default invokes `serve`) watches `src/` and recompiles on change. A WebSocket server on `BXM_LIVERELOAD_PORT` (35729) notifies the extension's contexts. Background SW reloads itself via `chrome.runtime.reload()`; other contexts reload via `window.location.reload()`.

## Output for Chrome's "Load unpacked"

Point Chrome at `packaged/chromium/raw/` — that's the strict-JSON, fully-assembled Chrome-loadable build. NOT `dist/` (which has JSON5 manifest mid-pipeline). The test framework's boot layer auto-targets `packaged/chromium/raw/` for the same reason — see [test-boot-layer.md](test-boot-layer.md).

## See also

- [components.md](components.md) — the seven component contexts
- [templating.md](templating.md) — `{{ }}` token replacement
- [css.md](css.md) — SCSS load paths
- [defaults.md](defaults.md) — `src/defaults/` template system
- [hooks.md](hooks.md) — `build:pre` / `build:post`
- [translations.md](translations.md) — auto-translate `_locales/`
- [publishing.md](publishing.md) — store auto-publishing
- [test-boot-layer.md](test-boot-layer.md) — verify the packaged extension actually boots in Chromium
