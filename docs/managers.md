# Manager Classes

Each component context has its own Manager class — a one-line import + `initialize()` bootstrap that wires up `extension` (the cross-browser API wrapper), `logger`, `webManager` (Firebase auth), `messenger`, and cross-context helpers.

## Import paths

| Context | Import | Source |
|---|---|---|
| Build-time (Node) | `require('browser-extension-manager/build')` | [src/build.js](../src/build.js) |
| Background SW | `require('browser-extension-manager/background')` | [src/background.js](../src/background.js) |
| Popup | `require('browser-extension-manager/popup')` | [src/popup.js](../src/popup.js) |
| Options | `require('browser-extension-manager/options')` | [src/options.js](../src/options.js) |
| Sidepanel | `require('browser-extension-manager/sidepanel')` | [src/sidepanel.js](../src/sidepanel.js) |
| Pages (custom) | `require('browser-extension-manager/page')` | [src/page.js](../src/page.js) |
| Content script | `require('browser-extension-manager/content')` | [src/content.js](../src/content.js) |
| Offscreen | `require('browser-extension-manager/offscreen')` | [src/offscreen.js](../src/offscreen.js) |

## One-line bootstrap

Every consumer-side context entry is the same shape:

```js
// src/assets/js/components/popup/index.js
import Manager from 'browser-extension-manager/popup';

const manager = new Manager();
await manager.initialize();

// Manager now exposes:
//   manager.extension   — cross-browser chrome.*/browser.* API wrapper (see docs/extension.md)
//   manager.logger      — LoggerLite('popup') with timestamped output
//   manager.webManager  — Web Manager (Firebase, auth, analytics, bindings)
//   manager.messenger   — wired automatically; chrome.runtime.onMessage listener installed
//   manager.isDevelopment() / isProduction() / isTesting() / getVersion()  (cross-context helpers)
```

The contexts that include `web-manager` (popup / options / sidepanel / page) also run the auth sync handshake automatically — see [auth.md](auth.md).

## Build-time Manager

`browser-extension-manager/build` is the build-time Manager — used in gulp tasks, CLI commands, and tests. Different surface from the runtime Managers:

```js
const Manager = require('browser-extension-manager/build');

Manager.getConfig();         // → parsed config/browser-extension-manager.json
Manager.getManifest();       // → parsed src/manifest.json (JSON5)
Manager.getPackage('project');   // → cwd's package.json
Manager.getPackage('main');      // → BXM's own package.json
Manager.getRootPath('project');  // → process.cwd()
Manager.getRootPath('main');     // → path to BXM's dist
Manager.getEnvironment();    // → 'production' if BXM_BUILD_MODE=true else 'development'
Manager.getLiveReloadPort(); // → 35729 by default
Manager.isBuildMode();       // → boolean
Manager.actLikeProduction(); // → buildMode || UJ_AUDIT_FORCE
Manager.require(name);       // → borrow any of BXM's bundled deps (json5, fs-jetpack, etc.)
Manager.logger(name);        // → new logger('name') instance
Manager.reportBuildError(e); // → notifly + log
```

Cross-context helpers (`isTesting/isDevelopment/isProduction/getVersion`) are available on `Manager` as static methods AND on instances. See [environment-detection.md](environment-detection.md).

## Boot flow inside `initialize()`

Each Manager's `initialize()`:

1. **Read configuration** — from `window.BXM_BUILD_JSON?.config` (injected by webpack at build time)
2. **Wire `extension`** — singleton from [src/lib/extension.js](../src/lib/extension.js), normalized chrome.*/browser.* API
3. **Construct `logger`** — `new LoggerLite('<context>')` from [src/lib/logger-lite.js](../src/lib/logger-lite.js)
4. **Initialize `webManager`** (popup/options/sidepanel/page only) — `webManager.initialize(config)`
5. **Set up auth listener** — `webManager.auth().listen((state) => { /* ... */ })`
6. **Sync with background** — call `syncWithBackground(this)` from [src/lib/auth-helpers.js](../src/lib/auth-helpers.js); see [auth.md](auth.md)
7. **Install broadcast / sign-out / event listeners** — handles signin-from-other-context, signout propagation
8. **Return the manager instance**

Background.js is more involved — it owns the auth source of truth, listens for `bxm:syncAuth` from other contexts, handles the website token flow. See [auth.md](auth.md).

## Auth-related shortcuts (popup / options / sidepanel / page)

These Manager classes expose `manager.openAuthPage(options)` — opens the website's `/token` page (with `authSourceTabId` so tab restoration works after sign-in). See [auth.md](auth.md) for the full flow.

## Mixin: cross-context helpers

Every Manager file imports `attachTo` from [src/utils/mode-helpers.js](../src/utils/mode-helpers.js) and calls it at the bottom of the file:

```js
import { attachTo as attachModeHelpers } from './utils/mode-helpers.js';
// ... class Manager { ... }
attachModeHelpers(Manager);
export default Manager;
```

That gives every Manager `isDevelopment` / `isProduction` / `isTesting` / `getVersion` on both the prototype and the constructor. See [environment-detection.md](environment-detection.md).

## See also

- [components.md](components.md) — the seven component contexts
- [extension.md](extension.md) — the cross-browser chrome.* API wrapper
- [auth.md](auth.md) — how background.js coordinates auth across contexts
- [environment-detection.md](environment-detection.md) — `isTesting / isDevelopment / getVersion`
