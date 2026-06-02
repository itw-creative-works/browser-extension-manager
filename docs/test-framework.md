# Test Framework

Built-in test framework for both BXM itself and consumer projects. Jest-like assertion syntax (`expect(actual).toBe(expected)`), four layers, BEM/EM-style output.

## Running tests

```bash
npx bxm test                          # runs framework + project suites
npx bxm test --layer build            # only build-layer suites (plain Node, fast)
npx bxm test --layer background       # only background-layer suites (real MV3 SW)
npx bxm test --layer view             # only view-layer suites (popup/options/sidepanel)
npx bxm test --layer boot             # only boot-layer suites (real consumer extension)
npx bxm test --filter "messaging"     # only suites/tests whose name contains "messaging"
npx bxm test --integration            # run integration suites against REAL external services (Firebase, etc.) — normal mode skips them in-source, never mocks them
npx bxm test --reporter json          # pretty output + machine-readable {"event":"summary",...} line
BXM_TEST_DEBUG=1 npx bxm test         # see Chromium/SW stderr (otherwise drained silently)
```

In BXM itself, `npm test` does the same.

## Layers

| Layer | Runs in | Use for |
|---|---|---|
| `build` | Plain Node, fast (~ms) | `Manager.getConfig/getManifest/getPackage`, CLI alias resolution, schema/manifest validation, build helpers, `lib/*.js` regex maps + utilities |
| `background` | Real MV3 service worker via Puppeteer + CDP | Background boot sequence, Firebase auth wiring, messaging listeners, `chrome.runtime.onMessage` handlers |
| `view` | Chromium tab loading harness extension's popup.html / options.html / sidepanel.html | DOM bindings, Manager surface, web-manager integration, popup ↔ background messaging |
| `boot` | Real headless Chromium with the **consumer's** `packaged/<browser>/raw/` loaded as unpacked | End-to-end smoke: does the consumer's actual extension boot? Manifest validates? SW comes up? Popup renders? |

`all` (default) runs build → background → view → boot.

## NEVER mock — test against the real harness

Every layer hands your test the **real** runtime, never a hand-rolled fake:

- **No `mockManager`, no fake `chrome`/`browser` objects, no stubbed background/popup contexts.** `background`-layer tests run inside a real MV3 service worker with the real `chrome.*` API; `view`-layer tests run inside a real Chromium tab with the real DOM and real `chrome.runtime` messaging; `boot`-layer tests load the consumer's real packaged extension. Use what the harness gives you (`ctx`, `ctx.manager`, `ctx.page`, the `inspect` callback's `{ extension, page }`, and the browser globals `chrome` / `document` / `window`) — do not reconstruct any of it.
- **Pure functions (zero I/O) are the only thing you call directly.** A regex map in `lib/*.js`, a string formatter, a config-shape validator — `require` it and assert on its output in a `build`-layer test. That is not mocking; it is calling a pure function. Anything that touches real I/O (storage, messaging, the SW lifecycle, the DOM, the network) runs against the real harness, not a substitute.

### Real external APIs are GATED, NOT mocked

Tests that hit a real external service (Firebase, push, any network call) live in **integration suites** and are gated behind `npx bxm test --integration`:

- **Normal mode** (`npx bxm test`) **SKIPS** these calls **in-source** — guard them with `ctx.skip(reason)` (or an early return) so the test no-ops when `--integration` is absent. The external API is **skipped in-source, NOT mocked.** Never stand up a fake Firebase / fake fetch to make a normal-mode run go green.
- **Integration mode** (`npx bxm test --integration`) runs the same code against the **real** service.
- **Anything an integration test creates externally MUST be cleaned up by the test** — delete the doc/user/record it created (use the suite/group `cleanup: async (ctx) => { ... }` hook, which runs after the last test). Leave no residue in the real backend.

### The ONLY two exceptions where a narrow stub is allowed

Mock **nothing** by default. There are exactly two cases where the real dependency genuinely cannot run in the test environment — and even then, stub the *smallest possible seam* (one method / one module), restore it immediately, and comment *why*:

1. **A side effect that would destroy the test run itself.** If invoking the real thing would kill or corrupt the harness — a process-exit, a destructive clean/wipe, or a *recursive re-invocation of a CLI command* (running the real `test`/`clean`/`setup` command from inside a test re-enters the runner) — you may stub *that one module/call* to a no-op, assert the dispatch logic, then restore. (Example: `cli.test.js` stubs the real command modules so testing CLI dispatch doesn't actually run them.)
2. **A real dependency the test environment can't provide.** When the real object only exists from infra you can't stand up in a `build`-layer unit test, a unit test may hand a minimal stub to verify a narrow side effect — but a real-harness layer (`background`/`view`/`boot`) MUST still cover the wired path where one exists.

If you can run it for real, you must. These exceptions are not a license to unit-test in isolation when a real-harness layer would work.

## `BXM_TEST_MODE=true` — the canonical "we're in tests" signal

Both BXM test runners set `BXM_TEST_MODE=true` in spawned child envs. That powers `manager.isTesting()` (and `Manager.isTesting()` static) — the cross-context helper anything in BXM/consumer code should check when behavior needs to differ in tests. See [environment-detection.md](environment-detection.md).

Consumers writing their own tests get this automatically when running through `npx bxm test`. To set it manually in another runner:

```json
"test": "BXM_TEST_MODE=true vitest"
```

## Test discovery

- **Framework defaults**: `<BXM>/dist/test/suites/**/*.js`
- **Consumer suites**: `<cwd>/test/**/*.js`

Directories starting with `_` are ignored. Files load alphabetically.

**Framework's boot suites are scoped to BXM self-test runs only.** When a consumer runs `npx bxm test`, the framework's `dist/test/suites/boot/**` is excluded from discovery (those tests assert on BXM's internal fixture extension). Consumers write their own boot tests under `<cwd>/test/boot/`. See [test-boot-layer.md](test-boot-layer.md).

## `test/_init.js` — pre-test lifecycle hook

The runner loads an optional `test/_init.js` from **both** test roots — the framework (`<BXM>/test/_init.js`) and the consumer project (`<cwd>/test/_init.js`) — and runs it **once, before any suite** (it is NOT itself run as a test; the `_`-prefix keeps it out of discovery). Mirrors the same hook in BEM/EM/UJM so all four frameworks share one shape.

The module **must export a function** — `module.exports = (ctx) => ({ ... })` — called with `{ projectRoot }` and returning the hook object. It may declare:

- `async setup({ projectRoot })` — runs once before the suites, e.g. to scaffold a fixture file the boot layer needs.

There is **no `cleanup` hook** and **no `accounts` field** (unlike BEM — these frameworks have no auth/user system): tests clean up after themselves, so there is nothing project-level to tear down.

```javascript
// <cwd>/test/_init.js
const fs = require('fs');
const path = require('path');

module.exports = ({ projectRoot }) => ({
  async setup() {
    // Seed any fixture a suite needs before it runs.
    fs.mkdirSync(path.join(projectRoot, '.temp'), { recursive: true });
  },
});
```

## Test file shapes

Three forms — pick whichever fits.

### Suite (sequential, share state, stop on first failure)

```js
module.exports = {
  type: 'suite',
  layer: 'background',
  description: 'storage round-trip',
  cleanup: async (ctx) => { /* runs after the last test */ },
  tests: [
    {
      name: 'set returns without throwing',
      run: async (ctx) => {
        await chrome.storage.local.set({ k: 'v' });
        ctx.expect(true).toBe(true);
      },
    },
    {
      name: 'get returns the just-set value',
      run: async (ctx) => {
        const out = await chrome.storage.local.get('k');
        ctx.expect(out.k).toBe('v');
      },
    },
  ],
};
```

Tests share `ctx.state` across the suite. If one fails, remaining tests are skipped (`stopOnFailure: false` to disable).

### Group (sequential, share state, run all regardless of failures)

```js
module.exports = {
  type: 'group',
  layer: 'build',
  description: 'config defaults',
  tests: [ /* same shape as suite */ ],
};
```

### Standalone (single test per file)

```js
module.exports = {
  layer: 'build',
  description: 'manifest_version is 3',
  run: (ctx) => {
    const m = Manager.getManifest();
    ctx.expect(m.manifest_version).toBe(3);
  },
};
```

### Array form (treated as a group)

```js
module.exports = [
  { name: 'test 1', run: (ctx) => { /* ... */ } },
  { name: 'test 2', run: (ctx) => { /* ... */ } },
];
```

## The `ctx` object

Every `run` / `cleanup` callback receives `ctx`:

- `ctx.expect` — Jest-compatible assertion library
- `ctx.state` — shared object across tests in a suite/group
- `ctx.skip(reason)` — throw to skip the current test at runtime
- `ctx.layer` — current layer name (`'build' | 'background' | 'view' | 'boot'`)
- `ctx.manager` — present on background-layer tests (the framework Manager instance)
- `ctx.page` — present on view-layer tests (the loaded tab's window)

Boot-layer tests use `inspect: async ({ extension, page, expect, projectRoot }) => { ... }` instead of `run`. See [test-boot-layer.md](test-boot-layer.md).

## `expect()` matchers

Same Jest-compatible surface across all layers:

```js
ctx.expect(actual).toBe(expected);                     // strict ===
ctx.expect(actual).toEqual(expected);                  // deep equality
ctx.expect(actual).toBeTruthy() / .toBeFalsy()
ctx.expect(actual).toBeDefined() / .toBeUndefined()
ctx.expect(actual).toBeNull()
ctx.expect(actual).toContain(item);                    // string or array
ctx.expect(actual).toHaveProperty('key')
ctx.expect(actual).toMatch(/regex/)
ctx.expect(actual).toBeInstanceOf(Class)
ctx.expect(actual).toBeGreaterThan(n) / .toBeLessThan(n)
await ctx.expect(fn).toThrow(/regex/)                  // async — fn may be async
ctx.expect(actual).not.toBe(expected)                  // negation: every matcher
```

## Consumer pattern — use the public Manager API

Don't `require('json5')` or other transitive BXM deps directly from consumer tests — they're not in your `package.json` and the resolution path is fragile. Instead use BXM's public API:

```js
const Manager = require('browser-extension-manager/build');

// Parsed JSON5 — same logic the framework uses internally
const config   = Manager.getConfig();
const manifest = Manager.getManifest();

// Borrow any of BXM's bundled deps without listing them yourself
const JSON5 = Manager.require('json5');
```

This is the same pattern EM and BEM consumers use — assert on framework API output rather than re-implementing parsing/loading in every test.

## Build-layer example

```js
// test/build/config.test.js
const Manager = require('browser-extension-manager/build');

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'config has required brand fields',
  tests: [
    {
      name: 'brand.id is set',
      run: (ctx) => {
        ctx.expect(Manager.getConfig().brand.id).toBeTruthy();
      },
    },
    {
      name: 'firebaseConfig.projectId matches brand.id',
      run: (ctx) => {
        const cfg = Manager.getConfig();
        ctx.expect(cfg.firebaseConfig.projectId).toBe(cfg.brand.id);
      },
    },
  ],
};
```

## Background-layer example

```js
// test/background/messaging.test.js
module.exports = {
  type: 'suite',
  layer: 'background',
  description: 'chrome.runtime.* surface in real SW',
  tests: [
    {
      name: 'chrome.runtime.id is a non-empty string',
      run: async (ctx) => {
        ctx.expect(typeof chrome.runtime.id).toBe('string');
        ctx.expect(chrome.runtime.id.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'storage.local round-trip',
      run: async (ctx) => {
        await chrome.storage.local.set({ k: 'v' });
        const out = await chrome.storage.local.get('k');
        ctx.expect(out.k).toBe('v');
      },
    },
  ],
};
```

## View-layer example

```js
// test/view/popup.test.js
module.exports = {
  type: 'suite',
  layer: 'view',
  context: 'popup',     // popup | options | sidepanel — which HTML to open
  description: 'popup DOM + chrome surface',
  tests: [
    {
      name: 'document body has data-bxm-context="popup"',
      run: async (ctx) => {
        ctx.expect(document.body.dataset.bxmContext).toBe('popup');
      },
    },
    {
      name: 'popup ↔ background messaging round-trip',
      run: async (ctx) => {
        const reply = await chrome.runtime.sendMessage({ type: 'bxm:test:ping' });
        ctx.expect(reply.pong).toBe(true);
      },
    },
  ],
};
```

For boot-layer (`inspect: async ({ extension, page, expect }) => { ... }`) tests, see [test-boot-layer.md](test-boot-layer.md).

## How browser-layer tests are shipped to the SW/tab

MV3 service workers have a strict CSP that forbids `eval` / `new Function` / `new AsyncFunction`. So we can't rebuild test functions from a string inside the SW.

Instead: each test's source is **baked as a literal async-function expression** directly into the payload at runner build-time, then evaluated as top-level Runtime.evaluate (CDP-exempt from CSP). No inner `eval` happens inside the SW. Tests communicate results back via `console.log('__BXM_TEST__' + JSON.stringify(evt))`, which the Node-side runner parses via CDP `Runtime.consoleAPICalled`.

You don't have to think about this — write tests in normal JS — but it's why test bodies must be **self-contained**: they can't close over their file's module scope. Use `ctx`, `expect`, `state`, and the browser globals (`chrome`, `document`, `window`) only.

## Why a custom harness instead of Jest / Vitest?

Browser-context code (background SW, popup DOM, content script) only runs inside Chromium. This is exactly why BXM does not let you mock: a faked `chrome.runtime` (Jest's jsdom can't reproduce it faithfully) or a stubbed API (`webextension-polyfill` provides one, but it doesn't catch real SW lifecycle bugs) passes tests while shipping broken extensions. Puppeteer gives a real Chromium with real `chrome.*` APIs, so the harness is the real thing — not a substitute you assert against. See [NEVER mock](#never-mock--test-against-the-real-harness).

Same trade-off EM ran into with Electron — tests must run inside the real runtime, so the framework owns the runner.

## See also

- [test-boot-layer.md](test-boot-layer.md) — boot layer deep-dive (loads consumer's actual packaged extension)
- [environment-detection.md](environment-detection.md) — `Manager.isTesting()` / `isDevelopment()` / etc.
