# Component Architecture

Extensions are organized around **components**, each representing a distinct browser-extension context. Each component bundles a view, styles, and script.

## The seven component contexts

| Component | Runs in | When |
|---|---|---|
| `background` | MV3 service worker | Always — extension's source of truth, handles auth, messaging, lifecycle |
| `popup` | Browser-action popup tab | When the user clicks the extension's toolbar button |
| `options` | Standalone tab (or embedded settings page) | When the user opens extension settings |
| `sidepanel` | Chrome side panel (Chrome 114+) | When the user opens the side panel |
| `content` | Each web page the user visits | Injected by manifest `content_scripts` (or programmatically) |
| `pages` | A custom extension page (e.g. dashboard, welcome) | Routed via `chrome.tabs.create({ url: chrome.runtime.getURL('views/pages/index.html') })` |
| `offscreen` | Offscreen document (Chrome 109+) | Persistent SW-adjacent context for WebSocket, DOM parsing, long-running tasks |

## Each component has three parts

For a component named `<component>`:

| Part | Source file | Compiled output |
|---|---|---|
| **View** (HTML) | `src/views/<component>/index.html` | `dist/views/<component>/index.html` |
| **Styles** (SCSS) | `src/assets/css/components/<component>/index.scss` | `dist/assets/css/components/<component>.bundle.css` |
| **Script** (JS) | `src/assets/js/components/<component>/index.js` | `dist/assets/js/components/<component>.bundle.js` |

The build pipeline wires these together — `views/<component>/index.html` automatically references its matching `.bundle.css` and `.bundle.js`.

## Manager-per-context

Each component context gets its own Manager class with a one-line bootstrap. See [managers.md](managers.md) for the full list and import paths.

## Boot order across contexts

There is no global "boot order" — each context boots independently when the browser instantiates it. BUT they coordinate via messaging:

1. **Background SW** boots first when the extension is installed/reloaded — it's the source of truth.
2. **Popup / options / sidepanel / pages** boot lazily when the user opens them. On boot they `bxm:syncAuth` to background to align with the canonical auth state.
3. **Content scripts** boot per-page-load (or per-tab navigation, depending on `run_at`).
4. **Offscreen** is created on demand by background (e.g. when it needs DOM parsing or a long-lived WebSocket).

See [auth.md](auth.md) for the detailed sign-in / sign-out / context-load flows.

## Adding a new component type to the framework

This is rare — only needed if you're adding a brand new context kind to BXM (e.g. devtools panel). For most consumer needs, "add a new page" means creating a new entry under `src/views/pages/<name>/` (one component, many pages).

If you DO need to add a new top-level component type:

1. **Framework styles** — `src/assets/css/components/<component>/index.scss`
2. **Default template files** copied into consumer projects:
   - `src/defaults/src/assets/css/components/<component>/index.scss`
   - `src/defaults/src/assets/js/components/<component>/index.js`
   - `src/defaults/src/views/<component>/index.html`
3. **Manager class** if the new context needs its own bootstrap surface — `src/<component>.js` (mirror `src/popup.js` shape).
4. **Export in package.json**:
   ```json
   {
     "exports": {
       "./<component>": "./dist/<component>.js"
     }
   }
   ```
5. **Mix in cross-context helpers** at the bottom of the new Manager file — see [environment-detection.md](environment-detection.md).

## See also

- [managers.md](managers.md) — Manager classes, one-line bootstrap per context
- [build-system.md](build-system.md) — how components compile through webpack/sass/html
- [defaults.md](defaults.md) — the `src/defaults/` template system
- [css.md](css.md) — SCSS load paths for component styles
