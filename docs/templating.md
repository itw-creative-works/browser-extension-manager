# HTML Templating

HTML views go through a two-step `{{ }}` token replacement during the `gulp/html` task. Same convention as EM and UJM.

## How it works

1. Your view file (`src/views/<component>/index.html`) is templated first — `{{ brand.name }}` etc. resolve against the page-vars object.
2. The result is injected into [src/config/page-template.html](../src/config/page-template.html) (the framework's outer HTML shell).
3. The outer template is processed again with the same vars.
4. Output written to `dist/views/<component>/index.html`.

## Available variables

| Token | Source | Example |
|---|---|---|
| `{{ brand.name }}` | `config/browser-extension-manager.json` → `brand.name` | `Tabblar` |
| `{{ brand.url }}` | `config/browser-extension-manager.json` → `brand.url` | `https://tabblar.com` |
| `{{ brand.id }}` | `config/browser-extension-manager.json` → `brand.id` | `tabblar` |
| `{{ page.name }}` | Component name (e.g. `popup`, `pages/dashboard`) | `popup` |
| `{{ page.path }}` | Full view path | `views/popup/index.html` |
| `{{ page.title }}` | Page title — defaults to brand name | `Tabblar` |
| `{{ theme.appearance }}` | Theme appearance: `dark` or `light` | `dark` |
| `{{ cacheBust }}` | Cache-busting timestamp (build time) | `1715568000` |
| `{{ version }}` | `package.json#version` | `1.1.10` |
| `{{ environment }}` | `'production'` or `'development'` | `production` |

## Example usage

```html
<!-- src/views/popup/index.html -->
<!doctype html>
<html>
<head><title>{{ page.title }}</title></head>
<body>
  <h1>Welcome to {{ brand.name }}</h1>
  <a href="{{ brand.url }}/pricing?ref=ext">Upgrade to Premium</a>
  <p>Version {{ version }}</p>
</body>
</html>
```

## Page template

[src/config/page-template.html](../src/config/page-template.html) is the outer shell that wraps every view. It contains:
- `<!doctype html>` + `<html>` boilerplate
- `<meta>` tags (viewport, charset)
- A `{{ content }}` slot where the per-component HTML is injected
- `<link rel="stylesheet">` for the component's `.bundle.css`
- `<script>` for the component's `.bundle.js`
- Cache-busting query params via `{{ cacheBust }}`

Consumers don't author this — BXM owns it. If you need to customize per-view, override directly in `src/views/<component>/index.html` (BXM detects when a view provides its own full `<html>` and skips wrapping).

## Customizing page vars

The page-vars object is built by [src/gulp/tasks/html.js](../src/gulp/tasks/html.js). To add a new variable for consumer templates, edit the `buildPageVars()` helper there. Vars added are available in BOTH the view file AND the outer page-template.html.

## Why two passes?

Pass 1 lets a view interpolate something into the outer template. For example, a view can do `<!-- bxm:page-title --> Custom Title <!-- /bxm:page-title -->` (a future feature) and have the value flow into `{{ page.title }}` for the outer template's `<title>`. The pattern keeps simple cases simple (`{{ brand.name }}` Just Works) while leaving room for view → shell metadata flow.

## See also

- [build-system.md](build-system.md) — gulp pipeline including the html task
- [css.md](css.md) — how the page template references compiled CSS bundles
- [themes.md](themes.md) — `{{ theme.appearance }}` derivation
