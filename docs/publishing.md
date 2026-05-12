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

## See also

- [build-system.md](build-system.md) — packaging pipeline that produces the per-browser zips
- [hooks.md](hooks.md) — `build:pre` and `build:post` hooks run before/after publish
- [cli.md](cli.md) — env var conventions
