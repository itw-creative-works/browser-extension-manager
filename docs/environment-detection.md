# Environment Detection

`getEnvironment()` returns exactly ONE of three mutually-exclusive, exhaustive values:

```javascript
Manager.getEnvironment()    // 'development' | 'testing' | 'production'

Manager.isDevelopment()     // true ONLY in development
Manager.isTesting()         // true ONLY in testing
Manager.isProduction()      // true ONLY in production
```

**The Manager is the single source of truth.** `getEnvironment()` is the ONLY function that reads the raw signals (`BXM_TEST_MODE` / `chrome.runtime.getManifest().update_url` / `BXM_BUILD_MODE` / `NODE_ENV` / `config.bxm.environment`). The three `is*()` checks **derive** from it live on every call — they never read raw signals themselves, so they can never disagree with `getEnvironment()`.

**One implementation, mixed into all eight Managers.** BXM has eight Manager entry points (build / background / popup / options / content / sidepanel / page / offscreen). The helpers are defined once in [src/utils/mode-helpers.js](../src/utils/mode-helpers.js) and mixed into each via `attachTo(Manager)`, available as both prototype methods (`manager.isTesting()`) and statics (`Manager.isTesting()`).

```javascript
manager.getEnvironment()    // same answer in every extension context
Manager.isTesting()         // static form, for build-time scripts
```

**Resolution order:** testing wins first, then production, else development. The three checks are mutually exclusive — exactly one is true. `isDevelopment()` is **false** during testing, and `isProduction()` is a real positive check (it is NOT `!isDevelopment()`).

## Available helpers

| Helper | Returns |
|---|---|
| `getEnvironment()` | `'development' \| 'testing' \| 'production'` — the SSOT resolver; the only reader of raw signals. |
| `isDevelopment()` | `true` ONLY in development (unpacked extension via chrome://extensions / dev build), and NOT testing. Derives from `getEnvironment()`. |
| `isTesting()` | `true` ONLY in testing (`BXM_TEST_MODE === 'true'`). **Takes precedence** — a test run is not development. |
| `isProduction()` | `true` ONLY in production (packed / store-installed extension, `manifest.update_url` present). A **real positive check** — NOT `!isDevelopment()`. |

## Gating side effects — use the INTENTIONAL check

Because there are three environments, never gate a side effect on a two-value assumption. State what you mean:

```javascript
// Production-only (skip real telemetry / production behavior in dev AND testing):
if (isProduction())  { /* do the real thing */ }
if (!isProduction()) { /* skip / use the safe local behavior */ }

// Local-or-test (anything that should run in BOTH dev and testing):
if (isDevelopment() || isTesting()) { /* DevTools menu items, verbose logging */ }
```

**Avoid** `if (!isDevelopment())` or `if (env !== 'development')` to gate production behavior — those wrongly include `testing` as production and leak real side effects during test runs. This is the bug class that motivated the 3-value model. (A genuinely dev-only feature like live-reload is the exception: `env !== 'development'` correctly skips it in both testing and production.)

## URL helpers

BXM does **not** own backend URL helpers (`getApiUrl` / `getFunctionsUrl` / `getWebsiteUrl`). Extension code that needs a backend URL reads it from the `web-manager` runtime singleton in the runtime contexts (popup / options / sidepanel / background), which follows the same local-in-dev/testing, production-otherwise convention. The rule "call the getter, never hardcode" still applies; the implementation lives in `web-manager`.

## Where they live

Source: [src/utils/mode-helpers.js](../src/utils/mode-helpers.js) for `getEnvironment()` + `is*()` + `getVersion()`. The module exposes the functions plus an `attachTo(Manager)` mixin. Attached at the bottom of all eight Manager files ([build.js](../src/build.js), [background.js](../src/background.js), [popup.js](../src/popup.js), [options.js](../src/options.js), [content.js](../src/content.js), [sidepanel.js](../src/sidepanel.js), [page.js](../src/page.js), [offscreen.js](../src/offscreen.js)), so every extension context resolves the environment identically.

## How detection works

`getEnvironment()` resolves in this precedence order:

1. **Testing** — `process.env.BXM_TEST_MODE === 'true'`, `globalThis.BXM_TEST_MODE === true`, or a build baked with `config.bxm.environment === 'testing'` (set by the harness before any consumer JS runs). A test run is a test run regardless of any other signal.
2. **Production / Development (runtime)** — `chrome.runtime.getManifest().update_url`: present → production (packed / store-installed), absent → development (unpacked). This is the authoritative runtime signal in an extension context. In build-time Node, `chrome` is undefined, so it falls through.
3. **Build-time + config signals** — `BXM_BUILD_MODE === 'true'` → production; `NODE_ENV === 'development'` → development; `config.bxm.environment` (`'development'` / `'production'`) override.
4. **Default** — development. BXM's deployed artifacts always carry their signal (a packed / store extension has `manifest.update_url`; build-time Node sets `BXM_BUILD_MODE`), so reaching here means a bare tooling / unpacked context where development is correct. (Contrast BEM/EM, whose deployed *runtime* can legitimately lack a signal, so they default to **production**.)

## Adding a new helper

Write the function in [src/utils/mode-helpers.js](../src/utils/mode-helpers.js) (or a new `src/utils/<topic>-helpers.js` module), expose it from `attachTo(Manager)`, then call `attachTo` at the bottom of all eight Manager files. Don't define helpers on individual Manager prototypes — that leads to duplicated semantics. For anything environment-derived, derive from `getEnvironment()` rather than reading `chrome.runtime` / `process.env` directly, so there is one source of truth and no chance of drift.

## Why this matters

**One signal, used everywhere.** The test runner sets `BXM_TEST_MODE=true`; every piece of code that calls `isTesting()` (framework or consumer) then sees `true` — no need to invent a per-module env var.

**Sub-modules check the same signal.** When framework code (an auto-update probe, an analytics flush) needs to skip side effects in tests, it checks `isTesting()` — the same answer the consumer's own code gets. No drift.

**`is*()` can never disagree with `getEnvironment()`.** Because the checks derive from the single resolver instead of reading raw signals (`manifest.update_url` vs `BXM_BUILD_MODE`), there is exactly one definition of "what environment is this," and a wrong-but-confident gate is structurally impossible.

## See also

- [test-framework.md](test-framework.md) — `BXM_TEST_MODE` is set automatically by the test runners; `--integration` gates real external APIs.
