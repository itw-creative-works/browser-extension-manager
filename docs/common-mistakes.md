# Common Mistakes to Avoid

1. **Defining a local `escapeHTML` / `sanitizeURL` helper** — Use the canonical inline form `webManager.utilities().escapeHTML(value)` / `.sanitizeURL(url)` at every call site. Do NOT alias / destructure / `.bind()`. This is the most common XSS-introduction vector in BXM extensions.
2. **Using raw `chrome.*` instead of `extension.*`** — Use the extension API wrapper for cross-browser compat (Chrome / Firefox / Edge).
3. **Putting service-worker-incompatible code in `background`** — Service workers can't hold WebSockets or long-running state. Use the `offscreen` component for persistent work.
4. **Trying to share Manager state across components** — Each component has its own Manager singleton. Use `extension.runtime.sendMessage` / `extension.storage` to communicate.
5. **Writing `<html>`/`<head>`/`<body>` in component views** — Views are HTML fragments; BXM wraps them with `page-template.html` at build time.
6. **Hand-editing `dist/manifest.json` or `dist/*` files** — Edit `config/manifest.json` (or component sources); BXM regenerates dist on every build.
7. **Installing BXM's dependencies as direct consumer deps** — Consumer projects must NOT `npm install firebase`, `web-manager`, or any other BXM/web-manager transitive dep. BXM's webpack config includes `resolve.modules` pointing at the framework's own `node_modules/`. If a dependency isn't resolving, the fix is in BXM's webpack config — not the consumer's `package.json`. Mirrors EM and UJM.
8. **Touching Firebase directly in consumer code** — Firebase is owned by web-manager. Consumer code NEVER does `import firebase from 'firebase/app'` or `require('firebase')`. Instead: `import webManager from 'web-manager'` → `webManager.auth()`, `webManager.firestore()`. Same rule in EM and UJM.
