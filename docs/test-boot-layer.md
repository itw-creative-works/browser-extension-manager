# Test Framework — Boot Layer

The `boot` layer spawns headless Chromium with the **consumer's actual built extension** loaded as unpacked, then runs `inspect` callbacks against the live runtime. Replaces shell-level "did the extension load?" smoke tests with deterministic, signal-driven pass/fail.

## What boot tests verify

Things that ONLY break when the whole pipeline assembles correctly:
- The packaged manifest is valid strict JSON (no JSON5 leakage)
- All referenced files (background.service_worker, content scripts, popup HTML) exist on disk
- The service worker boots without errors
- `chrome.runtime.id` is assigned (extension successfully registered)
- The popup page loads via `chrome-extension://<id>/<popup_path>`
- Messages between popup and background round-trip

If a boot test passes, the extension at minimum *loads* in a real Chrome — that alone catches a class of bugs unit tests can't (missing assets, manifest schema drift, file path typos).

## Test file shape

```js
module.exports = {
  layer: 'boot',
  description: 'extension loads + popup renders',
  timeout: 20000,
  inspect: async ({ extension, page, expect, projectRoot }) => {
    expect(extension.manifest.manifest_version).toBe(3);
    await page.goto(extension.popupUrl, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    expect(html).toContain('<html');
  },
};
```

Or as a group:

```js
module.exports = {
  type: 'group',
  layer: 'boot',
  description: 'extension boots end-to-end',
  tests: [
    {
      description: 'extension has a valid ID',
      inspect: async ({ extension, expect }) => {
        expect(extension.id).toMatch(/^[a-z]{32}$/);
      },
    },
    {
      description: 'service worker came up',
      inspect: async ({ extension, expect }) => {
        expect(extension.swTarget).not.toBeNull();
      },
    },
  ],
};
```

## The `inspect` callback args

```js
inspect: async ({ extension, page, expect, projectRoot }) => { /* ... */ }
```

| Arg | Type | Description |
|---|---|---|
| `extension.id` | string | The extension's chrome-extension://`<id>` ID — random per launch, 32-char a-z |
| `extension.manifest` | object | Parsed manifest.json |
| `extension.popupUrl` | string\|null | `chrome-extension://<id>/<manifest.action.default_popup>` or null |
| `extension.optionsUrl` | string\|null | `chrome-extension://<id>/<manifest.options_ui.page>` or null |
| `extension.swTarget` | Puppeteer Target | The service worker target (may be null if extension has no SW) |
| `page` | Puppeteer Page | A fresh tab — use `page.goto`, `page.evaluate`, `page.$eval`, etc. |
| `expect` | function | Jest-compatible matcher (same surface as other layers) |
| `projectRoot` | string | Absolute path to the consumer project |

Each boot test gets a **fresh** `page` (closed at the end of the test). The browser + extension load are shared across all boot tests in a single `npx bxm test` invocation (one Chromium boot per run, amortized across tests).

## Extension-directory discovery

The runner looks for the consumer's Chrome-loadable build in this order:

1. `BXM_TEST_BOOT_DIR` env var (absolute path) — full override
2. `<consumer>/packaged/chromium/raw/` — default. This is what BXM's gulp pipeline produces. Strict JSON manifest, all bundles compiled, locale files in place. Same dir a developer points "Load unpacked" at.
3. `<consumer>/dist/` — fallback for non-standard pipelines

The intermediate `<consumer>/dist/` typically has a JSON5 manifest (BXM-authored source style) which Chrome can't parse. If the runner picks `dist/` and finds JSON5, you get an actionable error:

```
✗ boot tests aborted: dist/manifest.json is not strict JSON.
  Chrome requires manifest.json to have no comments, no trailing commas, no single quotes.
  Parser error: Expected property name or '}' in JSON at position 4
  If you see this, the runner picked an intermediate dist/ output instead of a
  packaged/<browser>/raw/ output. Run `npm run build` to produce the packaged dir,
  or set BXM_TEST_BOOT_DIR to the directory that has strict-JSON manifest.json.
```

Most consumers don't need to think about this — `npm run build && npx bxm test` works.

## BXM_TEST_BOOT_PROJECT vs BXM_TEST_BOOT_DIR

| Env | Purpose |
|---|---|
| `BXM_TEST_BOOT_PROJECT` | Root of a different project to use instead of cwd. Auto-set when BXM tests itself (points at the in-tree fixture under `src/test/fixtures/consumer-extension`). |
| `BXM_TEST_BOOT_DIR` | Absolute path of the directory holding `manifest.json` — short-circuits the discovery order entirely. Use for monorepo layouts or custom output dirs. |

## What happens when the extension can't load

Chromium silently rejects extensions with malformed manifests (no chrome-extension:// target ever appears, no error in console). The runner detects this and surfaces likely causes:

```
✗ Boot aborted — Chromium loaded but no chrome-extension target appeared.
  Likely cause: the extension failed to load. Common reasons:
    - manifest.json missing required field (e.g. manifest_version: 3)
    - default_locale is set but _locales/<locale>/messages.json is missing
    - __MSG_*__ placeholders used without default_locale + _locales/
    - referenced files (background.service_worker, content_scripts) don't exist on disk
```

This catches real ship-breakers (broken locale references, missing bundles) before users see them.

## Skipping the build before boot tests

Boot tests assume `packaged/chromium/raw/` exists. They don't auto-trigger `npm run build` (that would slow the test loop). If the directory is missing, you get:

```
○ boot tests skipped (no manifest.json found in any of:
    /path/to/project/packaged/chromium/raw
    /path/to/project/dist
  — run `npm run build` first to produce packaged/chromium/raw/)
```

In CI, run build then test in separate steps so failures are isolated.

## Why this exists

Build-layer tests can verify "the manifest source is well-formed." Background-layer tests can verify "BXM's framework code works inside a SW." But neither catches "the consumer's actual pipeline assembles into a Chrome-loadable extension." Boot tests do.

In BXM's own self-tests, the boot layer points at a hand-authored fixture extension (`src/test/fixtures/consumer-extension/`) — a known-good minimal MV3 extension. That validates the framework's boot runner is working; consumer projects then point it at their own packaged output to validate THEIR pipeline.

## See also

- [test-framework.md](test-framework.md) — overall harness, layers, ctx, expect API
- [cross-context-helpers.md](cross-context-helpers.md) — `Manager.isTesting()` and friends
