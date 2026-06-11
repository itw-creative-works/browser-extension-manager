# XSS Prevention (ZERO TRUST — MANDATORY)

Zero tolerance for unescaped attacker-controllable strings in HTML. Extensions are especially exposed — content scripts read from arbitrary pages, popups render tab titles / URLs / favicon URLs, and all of those are attacker-controllable. Any string from outside the codebase (tab data, page DOM content, Firestore, API responses, URL params, user input) MUST be escaped before being inserted via `innerHTML`, `insertAdjacentHTML`, `outerHTML`, or attribute interpolation.

## The Rule

**Canonical form (same as UJM/EM):** `webManager.utilities().escapeHTML(value)` inline at every usage site.

```javascript
// ✅ CORRECT — canonical inline form
import webManager from 'web-manager';

$el.innerHTML = `<div>${webManager.utilities().escapeHTML(tab.title)}</div>`;
$el.innerHTML = `<img src="${webManager.utilities().escapeHTML(tab.favIconUrl)}" alt="">`;

// ❌ DANGEROUS — attacker-controlled favicon URL can break out of src=""
$el.innerHTML = `<img src="${tab.favIconUrl}">`;
// Malicious site serves: favIconUrl = 'x" onerror="alert(1)'
// Resulting HTML: <img src="x" onerror="alert(1)"> → executes in extension page context

// ❌ DANGEROUS — tab title can contain HTML
$el.innerHTML = `<h1>${tab.title}</h1>`;
```

**Common extension XSS vectors:**

- `tab.title`, `tab.url`, `tab.favIconUrl` from `chrome.tabs.query/get` — any visited page can set these.
- DOM content read by content scripts and sent back to privileged pages (popup/options/sidepanel).
- Bookmark titles, history entries, recently-closed tabs — all originate from arbitrary pages.
- Stored user data (snippets, saved workspaces) if a malicious page can influence what gets stored.

## NEVER Write Your Own Escape Function

Do NOT:

- Alias: `const escape = webManager.utilities().escapeHTML;`
- Wrap: `const escape = (s) => webManager.utilities().escapeHTML(s);`
- Destructure: `const { escapeHTML } = webManager.utilities();`
- `.bind()` it
- Define a local `escapeHtml`/`escapeHTML` helper in a `utils.js` and import it across files — this is the most common violation in BXM extensions. Delete the helper, add `import webManager from 'web-manager'`, inline the canonical form at every call site.

## URLs Must Also Be Sanitized

`escapeHTML` alone lets `javascript:alert(1)` through — dynamic URLs in executable sinks MUST also be wrapped in `webManager.utilities().sanitizeURL(url)`, which returns `''` for any non-`http:`/`https:` protocol (blocks `javascript:`, `data:`, `vbscript:`). Extensions often build UI from `tab.url` — a malicious page can set a `javascript:` URL that executes when clicked in the popup.

**Must sanitize (can execute JS):**

- `<a href>`, `<area href>`, `<base href>`
- `<iframe src>`
- `<form action>`, `formaction`
- `<object data>`
- `<script src>` (don't do dynamically)
- SVG `href` / `xlink:href`
- Property assignments: `.href =`, `.src =` (on above elements), `window.location =`, `location.href =`, `location.replace()`, `location.assign()`, `window.open()`, `extension.tabs.create({ url })` if `url` is dynamic

**Do NOT need to sanitize:**

- `<img src>`, `<video src>`, `<audio src>`, media `src`/`poster` — browsers ignore `javascript:` in media
- `<link href>` stylesheets
- Hardcoded paths

**Nesting:** sanitize first, then escape for HTML attributes. No escape needed for direct property assignment.

```javascript
// ✅ CORRECT — href in innerHTML (dynamic URL)
$el.innerHTML = `<a href="${webManager.utilities().escapeHTML(webManager.utilities().sanitizeURL(tab.url))}">${webManager.utilities().escapeHTML(tab.title)}</a>`;

// ✅ CORRECT — property assignment
$link.href = webManager.utilities().sanitizeURL(tab.url);
extension.tabs.create({ url: webManager.utilities().sanitizeURL(tab.url) });

// ❌ WRONG — escape alone lets `javascript:alert(1)` through
`<a href="${webManager.utilities().escapeHTML(tab.url)}">...</a>`
```

## Do NOT Escape Values Passed to textContent-Based APIs

`escapeHTML()` passes non-strings through unchanged — numbers, booleans, `null`, `undefined` come out exactly as they went in. Wrapping these is pure ceremony; it doesn't improve safety and adds reading cost. Don't escape:

- **Numbers, booleans, `null`, `undefined`** — `tabs.length`, `Date.now()`, flags.
- **`String(number)` coercion before escaping** — `escapeHTML(String(n))` is doubly redundant. Just interpolate: `${n}`.
- **Values from hardcoded maps/enums** — `STATUS_LABELS[key]`, icon-name literals, static SVG data URLs.
- **Framework-formatted strings** — `date.toLocaleDateString()`, `num.toFixed(2)`.

Safe by context (regardless of value):

- `textContent`, `.value`, `.placeholder` property assignments
- `setAttribute()` calls
- `webManager.utilities().showNotification(...)` — uses textContent internally; pre-escaping causes `'` → `&#039;` double-encoding visible to users.

## See also

- [components.md](components.md) — component architecture (where these strings get rendered)
- [common-mistakes.md](common-mistakes.md) — the local-helper violation is mistake #1
- `web-manager/src/modules/utilities.js` — the `escapeHTML` / `sanitizeURL` implementations
