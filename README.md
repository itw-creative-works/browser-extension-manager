<p align="center">
  <a href="https://itwcreativeworks.com">
    <img src="https://cdn.itwcreativeworks.com/assets/itw-creative-works/images/logo/itw-creative-works-brandmark-black-x.svg" width="100px">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/itw-creative-works/ultimate-browser-extension.svg">
  <br>
  <img src="https://img.shields.io/librariesio/release/npm/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/bundlephobia/min/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/codeclimate/maintainability-percentage/itw-creative-works/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/npm/dm/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/node/v/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/website/https/itwcreativeworks.com.svg">
  <img src="https://img.shields.io/github/license/itw-creative-works/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/github/contributors/itw-creative-works/ultimate-browser-extension.svg">
  <img src="https://img.shields.io/github/last-commit/itw-creative-works/ultimate-browser-extension.svg">
  <br>
  <br>
  <a href="https://itwcreativeworks.com">Site</a> | <a href="https://www.npmjs.com/package/ultimate-browser-extension">NPM Module</a> | <a href="https://github.com/itw-creative-works/ultimate-browser-extension">GitHub Repo</a>
  <br>
  <br>
  <strong>Ultimate Browser Extension</strong> is a template that helps you jumpstart your Jekyll sites and is fueled by an intuitive incorporation of npm, gulp, and is fully SEO optimized and blazingly fast.
</p>

## 🦄 Features
* **Build for Any Browser**: Export to Chrome, Firefox, Edge, and Opera.
* **NPM & Gulp**: Fueled by an intuitive incorporation of npm and gulp.

## 🚀 Getting started
1. [Create a repo](https://github.com/itw-creative-works/ultimate-browser-extension/generate) from the **Ultimate Browser Extension** template.
2. Clone the repo to your local machine.
3. Run these command to get everything setup and sync'd!
```bash
npm install
npx bxm setup
npm start
```
4. Open your browser and navigate to `chrome://extensions` (or the equivalent for your browser).
5. Enable **Developer mode**.
6. Click on **Load unpacked** and select the `dist` folder in your project directory.
7. Your extension should now be loaded and ready to use!

## 📦 How to sync with the template
1. Simply run `npx bxm setup` in Terminal to get all the latest updates from the **Ultimate Browser Extension template**.

## 🌐 Automatic Translation
When you run `npm run build`, BEM automatically translates your `src/_locales/en/messages.json` to 16 languages using Claude CLI:
`zh`, `es`, `hi`, `ar`, `pt`, `ru`, `ja`, `de`, `fr`, `ko`, `ur`, `id`, `bn`, `tl`, `vi`, `it`

Only missing translations are generated - existing translations are preserved.

## 🌎 Publishing your extension

### Manual Upload
1. Run `npm run build` in Terminal to build your extension for production.
2. Upload the `.zip` file to the browser's extension store.

### Automatic Publishing
BEM can automatically publish to Chrome, Firefox, and Edge stores when `BXM_IS_PUBLISH=true`:

```bash
BXM_IS_PUBLISH=true npm run build
```

**Setup:** Add store credentials to your `.env` file:

```bash
# Chrome Web Store
CHROME_EXTENSION_ID="your-extension-id"
CHROME_CLIENT_ID="your-client-id"
CHROME_CLIENT_SECRET="your-client-secret"
CHROME_REFRESH_TOKEN="your-refresh-token"

# Firefox Add-ons
FIREFOX_EXTENSION_ID="your-extension-id"
FIREFOX_API_KEY="your-api-key"
FIREFOX_API_SECRET="your-api-secret"

# Microsoft Edge Add-ons
EDGE_PRODUCT_ID="your-product-id"
EDGE_CLIENT_ID="your-client-id"
EDGE_API_KEY="your-api-key"
```

Only stores with configured credentials will be published to.

## 🔐 Authentication

BEM provides built-in authentication support that syncs across all extension contexts (popup, options, pages, sidepanel, background).

### Auth Architecture Overview

**Background.js is the source of truth** for authentication state. When a user signs in via the website, the auth token flows through background.js to all other contexts via `chrome.storage`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SIGN-IN FLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. User clicks .auth-signin-btn in any context                         │
│  2. Extension opens https://{authDomain}/token?authSourceTabId=123      │
│  3. Website authenticates user, redirects to /token?authToken=xxx       │
│  4. Background.js detects URL via tabs.onUpdated listener               │
│  5. Background signs in Firebase with custom token                      │
│  6. Background saves auth state to chrome.storage (bxm:authState)       │
│  7. Background closes /token tab and reactivates original tab           │
│  8. Other contexts detect storage change and sign in their Firebase     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         SIGN-OUT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. User clicks .auth-signout-btn in any context                        │
│  2. Web Manager signs out Firebase locally                              │
│  3. Auth helper detects WM auth change, clears bxm:authState storage    │
│  4. Background.js detects storage cleared, signs out its Firebase       │
│  5. Other contexts detect storage change and sign out                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Required Configuration

Add `authDomain` to your Firebase config in `config/browser-extension-manager.json`:

```json
{
  "firebaseConfig": {
    "apiKey": "...",
    "authDomain": "your-app.firebaseapp.com",
    "projectId": "..."
  }
}
```

### Required Permission

Add the `tabs` permission to your `src/manifest.json`:

```json
{
  "permissions": ["tabs"]
}
```

This is required for background.js to monitor tab URL changes and detect auth tokens.

### Auth Button Classes

Add these classes to your HTML elements to enable automatic auth handling:

| Class | Description | Action |
|-------|-------------|--------|
| `.auth-signin-btn` | Sign in button | Opens `/token` page on website |
| `.auth-signout-btn` | Sign out button | Signs out via Web Manager (which triggers storage sync) |
| `.auth-account-btn` | Account button | Opens `/account` page on website |

### Example
```html
<!-- Sign In Button (shown when logged out) -->
<button class="btn auth-signin-btn" data-wm-bind="@show !auth.user">
  Sign In
</button>

<!-- Account Section (shown when logged in) -->
<div data-wm-bind="@show auth.user" hidden>
  <span data-wm-bind="@text auth.user.displayName">User</span>
  <a class="auth-account-btn" href="#">Account</a>
  <button class="auth-signout-btn">Sign Out</button>
</div>
```

### Reactive Bindings
- `data-wm-bind="@show auth.user"` - Show when logged in
- `data-wm-bind="@show !auth.user"` - Show when logged out
- `data-wm-bind="@text auth.user.displayName"` - Display user's name
- `data-wm-bind="@text auth.user.email"` - Display user's email
- `data-wm-bind="@attr src auth.user.photoURL"` - Set avatar image src

### Storage Key

Auth state is stored in `chrome.storage` under the key `bxm:authState`:

```javascript
{
  token: "firebase-custom-token",
  user: {
    uid: "...",
    email: "...",
    displayName: "...",
    photoURL: "...",
    emailVerified: true
  },
  timestamp: 1234567890
}
```

<!-- ## ⛳️ Flags
* `--test=false` - Coming soon
```bash
npm start -- --test=false
``` -->
