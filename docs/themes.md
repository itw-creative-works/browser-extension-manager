# Themes

BXM ships two themes plus a template for new ones. Themes vendor their own SCSS + JS + Bootstrap-compatible variable system.

## Available themes

| Theme | Source | What it provides |
|---|---|---|
| `bootstrap` | [src/assets/themes/bootstrap/](../src/assets/themes/bootstrap/) | Pure Bootstrap 5.3+. Use when you want unopinionated Bootstrap. |
| `classy` | [src/assets/themes/classy/](../src/assets/themes/classy/) | Bootstrap 5 + custom design system (colors, typography, components). The "branded" theme. |
| `_template` | [src/assets/themes/_template/](../src/assets/themes/_template/) | Template for creating new themes. Underscore prefix excludes it from production builds. |

## Activating a theme

Set in `config/browser-extension-manager.json`:

```jsonc
{
  theme: {
    id: 'classy',         // 'bootstrap' | 'classy' | '<your-theme>'
    appearance: 'dark',   // 'dark' | 'light' (optional — drives {{ theme.appearance }})
  },
}
```

Webpack's `__theme__` alias resolves to `src/assets/themes/<id>/` so consumer JS can do `import '__theme__/_theme.js'` and get the right theme's entry point. SCSS gets the same via the `theme` load-path entry (see [css.md](css.md)).

## Theme structure

```
src/assets/themes/<theme-id>/
├── _config.scss      # Theme variables (with !default so consumers can override)
├── _theme.scss       # Theme entry — @forward + @use
├── scss/             # Theme-specific SCSS (components, utilities)
└── js/               # Theme-specific JS (e.g. Bootstrap's modal/popper init)
└── _theme.js         # Theme JS entry (exposes Bootstrap globals to window.bootstrap)
```

## Creating a new theme

1. Copy `_template/` to a new directory: `cp -r src/assets/themes/_template src/assets/themes/my-theme`
2. Rename the directory (remove the `_` prefix — that's only for the template).
3. Customize `_config.scss` — variables like `$primary`, `$font-family-base`, etc.
4. Add theme-specific styles under `scss/`.
5. Update `_theme.scss` to forward your overrides.
6. Activate via `config/browser-extension-manager.json` → `theme.id: 'my-theme'`.

## Overriding theme variables

In a consumer's `src/assets/css/main.scss`:

```scss
// Override before @use to take effect
@use 'browser-extension-manager' as * with (
  $primary: #5B47FB,
  $secondary: #FFA500,
);
@use 'theme' as *;
```

`!default` flags on theme variables let `with (...)` overrides win.

## `{{ theme.appearance }}`

If `config.theme.appearance === 'dark'`, the HTML page template adds `class="dark"` (or `data-bs-theme="dark"`, depending on theme) to `<html>`. Theme SCSS can then key off `:root.dark` / `[data-bs-theme="dark"]` for dark-mode variants.

Consumer views can use `{{ theme.appearance }}` in their HTML to apply per-page tweaks. See [templating.md](templating.md).

## Why not Tailwind?

Themes are SCSS-first because BXM's roots are Bootstrap-based and most BXM consumers already use Bootstrap-style class names (`.btn`, `.card`, `.modal`). Tailwind requires a build step (PostCSS + content scanning) that would complicate the lean gulp pipeline. If a future theme wants Tailwind, drop it under `src/assets/themes/tailwind/` and wire its own build hook.

## See also

- [css.md](css.md) — SCSS load paths and component overrides
- [components.md](components.md) — component view + styles + script structure
- [build-system.md](build-system.md) — sass/webpack pipeline
