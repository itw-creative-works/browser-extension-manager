# Cross-Browser API Wrapper (`lib/extension.js`)

A singleton that normalizes the `chrome.*` / `browser.*` / `window.*` extension API surface so consumers write their extension once and it works on Chrome, Firefox, Edge, and other Chromium-based browsers.

## Import

```js
const ext = require('browser-extension-manager/lib/extension');

// or as a Manager property:
const Manager = new (require('browser-extension-manager/popup'));
await Manager.initialize();
const { extension } = Manager;     // same singleton
```

## How it works

For each known extension API, the wrapper tries in order:
1. `chrome.<api>` (Chrome, Edge, Opera, Brave)
2. `window.<api>` (some content-script contexts where chrome is exposed under window)
3. `browser.<api>` (Firefox)
4. `browser.extension.<api>` (legacy fallback)

The first one that resolves becomes the singleton's `<api>` property. Each lookup is wrapped in try/catch so unknown globals don't throw at module-load time — that's what makes the wrapper safe to import from Node contexts too (where none of these globals exist).

## Supported APIs

```
action, alarms, bookmarks, browsingData, browserAction,
certificateProvider, commands, contentSettings, contextMenus,
cookies, debugger, declarativeContent, declarativeNetRequest,
devtools, dns, documentScan, downloads, enterprise, events,
extension, extensionTypes, fileBrowserHandler, fileSystemProvider,
fontSettings, gcm, history, i18n, identity, idle, input, instanceID,
management, notifications, offscreen, omnibox, pageAction,
permissions, platformKeys, power, printerProvider, privacy, proxy,
runtime, scripting, search, sessions, sidePanel, storage, tabGroups,
tabs, topSites, tts, ttsEngine, userScripts, vpnProvider, wallpaper,
webNavigation, webRequest, windows
```

If a browser doesn't expose a given API, the property is `null` (not undefined), so consumers can branch on `if (extension.sidePanel) { ... }`.

## Usage

```js
const Manager = new (require('browser-extension-manager/popup'));
await Manager.initialize();
const { extension } = Manager;

// Works on Chrome, Firefox, Edge — identical call sites
extension.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Active tab:', tabs[0]);
});

extension.storage.get('key', (result) => { /* ... */ });
extension.runtime.sendMessage({ type: 'hello' });
extension.notifications.create({ /* ... */ });
```

## Storage normalization

The wrapper auto-resolves `storage` to `storage.sync` when available (preferred — synced across the user's Chrome sign-in), falling back to `storage.local` when sync isn't available (e.g. some Firefox MV2 contexts).

```js
extension.storage.set({ foo: 'bar' });
extension.storage.get('foo', (result) => console.log(result.foo));
```

If you specifically need local-only storage (per-machine, larger quota), use `chrome.storage.local.*` directly — bypass the wrapper.

## Node-safe by design

The wrapper imports cleanly from Node (build-time scripts, tests, gulp tasks) — every property is `null` in that context because none of the browser globals exist. This is what makes BXM's build-layer tests possible:

```js
// build-layer test (Node)
const ext = require('browser-extension-manager/lib/extension');
ctx.expect(ext.runtime).toBeNull();   // no chrome global in Node
```

## Why not `webextension-polyfill`?

`webextension-polyfill` shims Firefox's promise-returning APIs onto Chrome's callback-based APIs. Useful, but:
- Adds an npm dep that has to be loaded as a content-script before user code
- Doesn't address the case where APIs simply don't exist on a browser (e.g. `sidePanel` on Firefox)
- Slow boot in SW context

BXM's wrapper is simpler: detect what's there, expose null when it isn't, let user code branch. Combine with the promisification Chrome added in MV3 (callbacks return promises when omitted) for a polyfill-free async-friendly API.

## See also

- [managers.md](managers.md) — every Manager exposes `extension` after `initialize()`
- [components.md](components.md) — which API surface is available in which context
