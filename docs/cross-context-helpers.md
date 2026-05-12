# Cross-Context Helpers

`Manager.isTesting()` / `isDevelopment()` / `isProduction()` / `getVersion()` are shared helpers available on every BXM Manager — build-time and runtime, across all eight Manager contexts (build, background, popup, options, content, sidepanel, page, offscreen).

Use these instead of grepping `process.env` ad-hoc throughout your codebase. Single source of truth, same return shape everywhere.

## Available helpers

| Helper | What it returns |
|---|---|
| `isDevelopment()` | `true` when running unpacked (loaded via chrome://extensions or in dev build). Browser-side detection: `chrome.runtime.getManifest().update_url` is absent for unpacked extensions. Node-side: falls back to `NODE_ENV === 'development'` / `BXM_BUILD_MODE !== 'true'`. |
| `isProduction()` | Inverse of `isDevelopment()`. |
| `isTesting()` | `process.env.BXM_TEST_MODE === 'true'` OR `globalThis.BXM_TEST_MODE === true`. Set by BXM's test runners; consumers writing tests get this signal automatically. |
| `getVersion()` | Extension version. `chrome.runtime.getManifest().version` in browser contexts; `<cwd>/package.json#version` in Node contexts; `null` when neither resolves. |

## Where they live

Source: [src/utils/mode-helpers.js](../src/utils/mode-helpers.js). The module exposes both the functions and an `attachTo(Manager)` mixin that attaches them to a Manager constructor's prototype + the constructor itself (so `Manager.isTesting()` works statically too).

Attached at the bottom of all 8 Manager files: [build.js](../src/build.js), [background.js](../src/background.js), [popup.js](../src/popup.js), [options.js](../src/options.js), [content.js](../src/content.js), [sidepanel.js](../src/sidepanel.js), [page.js](../src/page.js), [offscreen.js](../src/offscreen.js).

## Usage — instance method

```js
const Manager = new (require('browser-extension-manager/popup'));
await Manager.initialize();

if (Manager.isDevelopment()) {
  Manager.logger.log('Running unpacked — extra DevTools logging on.');
}

if (Manager.isTesting()) {
  // Skip side effects that would interfere with assertions —
  // login items, dock bounce, telemetry, etc.
  return;
}
```

## Usage — static method

Same helpers also bind on the class itself, matching BEM's pattern:

```js
const Manager = require('browser-extension-manager/build');

if (Manager.isTesting()) {
  console.log('skip slow audit step in test mode');
}
```

Useful in build-time scripts where you don't have a Manager instance yet (gulp tasks, CLI commands).

## Why this matters

**One signal, used everywhere.** When a consumer writes a test, the test runner sets `BXM_TEST_MODE=true`. Every piece of code in the consumer's extension that calls `Manager.isTesting()` then sees `true` — no need for the consumer to invent their own env var, no need for the framework to forward the signal manually to each lib.

**Sub-modules check the same signal.** When BXM's framework code (e.g. an auto-update poll, an analytics flush) needs to skip side effects in tests, it checks `manager.isTesting()` — same answer the consumer's own code gets. No drift.

**Cross-context consistency.** A renderer-side helper and a SW-side helper return the same thing for the same env, even though the underlying detection mechanism differs (`chrome.runtime.getManifest().update_url` vs `NODE_ENV`).

## Adding a new helper

1. Write the function in a `src/utils/<topic>-helpers.js` module.
2. Expose `attachTo(Manager)` from the module.
3. At the bottom of each of the 8 Manager files, add `import { attachTo as attachWhatever } from './utils/<topic>-helpers.js'` + `attachWhatever(Manager)`.

Don't define helpers on individual Manager prototypes — that path leads to duplicated semantics (e.g. an `isDevelopment()` that does one thing in popup.js and a different thing in background.js). Centralize in `utils/`, mix in to all.

## See also

- [test-framework.md](test-framework.md) — `BXM_TEST_MODE` is set automatically by the test runners
- [managers.md](managers.md) — the 8 Manager classes and how they're imported
