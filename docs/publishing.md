# Publishing

`BXM_IS_PUBLISH=true npm run build` packages AND uploads to extension stores in one step.

## Supported stores

- **Chrome Web Store** (Chrome / Edge / Brave / Opera users)
- **Firefox Add-ons** (AMO)
- **Microsoft Edge Add-ons** (separate from Chrome Web Store — Edge Insiders + corporate environments)

Only stores with configured credentials get published to. Unconfigured stores are silently skipped.

## Setup — `.env`

Add store credentials to your project's `.env` (gitignored):

```bash
# Chrome Web Store
CHROME_EXTENSION_ID="..."
CHROME_CLIENT_ID="..."
CHROME_CLIENT_SECRET="..."
CHROME_REFRESH_TOKEN="..."

# Firefox Add-ons
FIREFOX_EXTENSION_ID="..."
FIREFOX_API_KEY="..."
FIREFOX_API_SECRET="..."

# Microsoft Edge Add-ons
EDGE_PRODUCT_ID="..."
EDGE_CLIENT_ID="..."
EDGE_API_KEY="..."
```

## Getting credentials

### Chrome Web Store

1. Create an OAuth client via [Google Cloud Console](https://console.cloud.google.com/) (Web application type)
2. Enable the [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api/)
3. Generate a refresh token via the OAuth flow (one-time)
4. `CHROME_EXTENSION_ID` is in your Chrome Web Store Developer Dashboard URL: `chrome.google.com/webstore/devconsole/<id>`

### Firefox Add-ons

1. Sign in to [Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Generate JWT credentials at "Manage API Keys"
3. `FIREFOX_EXTENSION_ID` matches the `id` field in your manifest's `browser_specific_settings.gecko.id`

### Microsoft Edge Add-ons

1. Sign up for the [Microsoft Edge Add-ons Partner Center](https://partner.microsoft.com/dashboard/microsoftedge)
2. Generate API credentials in the "API publishing" section
3. `EDGE_PRODUCT_ID` is the GUID assigned to your extension by Microsoft

## Publish flow

```bash
BXM_IS_PUBLISH=true npm run build
```

What happens:

1. `npm run build` runs the full gulp pipeline (build → package → packaged/<browser>/raw + zip)
2. `gulp/tasks/package.js` detects `BXM_IS_PUBLISH=true`
3. For each browser, reads the store credentials from `.env`
4. If credentials are present, uploads the `.zip` via the store's API
5. Logs success / failure per store; exits non-zero if any upload fails

## Manual upload

Run `npm run build` without `BXM_IS_PUBLISH=true` — you get unsigned `.zip` files per browser under `packaged/`:

```
packaged/
├── chromium/<ExtensionName>.zip
├── firefox/<ExtensionName>.zip
└── opera/<ExtensionName>.zip
```

Upload these manually via each store's web dashboard.

## CI / GitHub Actions

For automated releases, store credentials as encrypted GitHub Actions secrets. A typical workflow:

```yaml
- name: Build + publish
  env:
    BXM_IS_PUBLISH:        true
    CHROME_EXTENSION_ID:   ${{ secrets.CHROME_EXTENSION_ID }}
    CHROME_CLIENT_ID:      ${{ secrets.CHROME_CLIENT_ID }}
    CHROME_CLIENT_SECRET:  ${{ secrets.CHROME_CLIENT_SECRET }}
    CHROME_REFRESH_TOKEN:  ${{ secrets.CHROME_REFRESH_TOKEN }}
    # ...same for FIREFOX_*, EDGE_*
  run: npm run build
```

Same pattern EM uses for its desktop apps. Each store does its own review afterward (Chrome / Firefox: hours to a few days; Edge: typically same day).

## What about Safari?

Safari (Apple) uses a different extension model and requires Xcode-based packaging via `safari-web-extension-converter`. Not currently in scope for BXM's auto-publish. Manual conversion + App Store Connect upload is the route.

## Store listing description (`config/description.md`)

`config/description.md` is the Chrome Web Store listing description. When writing or rewriting it, first read `config/browser-extension-manager.json` (brand), `config/messages.json` (extension name + short description), `src/manifest.json` (permissions/features), and the component JS under `src/assets/js/components/` to understand what the extension actually does — be specific about real features, not generic copy.

**Format:**

```
[emoji] [Key Feature Headline 1]
[emoji] [Key Feature Headline 2]
[emoji] [Key Feature Headline 3]
[emoji] [Key Feature Headline 4]
[emoji] [Key Feature Headline 5]

[Extension Name] is [compelling one-sentence pitch]. [Pain point 1]. [Pain point 2]. [Pain point 3].
If you [target audience description] — [Extension Name] was made for you.

[emoji] How it works
[Extension Name] [brief mechanism description].

[emoji] [Feature 1]: [One-line description]
[emoji] [Feature 2]: [One-line description]
[emoji] [Feature 3]: [One-line description]
[emoji] [Feature 4]: [One-line description]

[Brief usage instructions — 2-3 sentences].
No complicated setup. No learning curve. Just [core value proposition].

[emoji] Why [Extension Name] is a game changer

[Benefit 1 title]: [Description].
[Benefit 2 title]: [Description].
[Benefit 3 title]: [Description].
[Benefit 4 title]: [Description].
[Benefit 5 title]: [Description].

[emoji] The [Extension Name] Difference
Most people either:

[Alternative 1 that's worse]
[Alternative 2 that's worse]

[Extension Name] gives you a [better option description].
[Catchy metaphor with emoji]
[Closing sentence about who benefits].

[emoji] Install [Extension Name] now and [call to action].
[Short imperative sentence].

:money_with_wings: Bonus:
While you're browsing, the extension also finds and applies shopping deals from top partners like Amazon, Capital One, and NordVPN. Get discounts and bonuses without lifting a finger. When you buy through links on our extension, we may earn an affiliate commission.

:locked_with_key: Your privacy is respected — we do not sell or misuse your data. By using our extension, you agree to our terms of service and privacy policy.
When you buy through links on our extension, we may earn an affiliate commission.
```

**Rules:**

- **Keep the Bonus section and Privacy section EXACTLY as shown** — do not modify these
- Use the extension's actual name from `config/messages.json` — do NOT use `{{ brand.name }}` template variables
- Be specific about features — reference what the code actually does
- Tone: enthusiastic, conversational, persuasive; emojis for section headers and feature bullets
- Feature headlines short and punchy (under 50 characters)
- 300-500 words (excluding the Bonus and Privacy sections)

**After rewriting**, clear stale cached translations — delete `.cache/translations/description/` and the `description` key from `.cache/translate.json` — then have the user run `npm run build` to regenerate translations (see [translations.md](translations.md)).

## See also

- [build-system.md](build-system.md) — packaging pipeline that produces the per-browser zips
- [hooks.md](hooks.md) — `build:pre` and `build:post` hooks run before/after publish
- [cli.md](cli.md) — env var conventions
