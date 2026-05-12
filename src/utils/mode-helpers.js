// Runtime mode helpers (BEM/EM-pattern), shared across BXM's eight context Managers
// (build / background / popup / options / content / sidepanel / page / offscreen).
//
// Three orthogonal concepts:
//   isDevelopment() — true when running unpacked from disk (an unpacked extension
//                     loaded via chrome://extensions or a dev build of the framework).
//                     Browser detection uses `chrome.runtime.getManifest().update_url`
//                     — packed extensions from the Web Store have one, unpacked ones
//                     do not. Falls back to NODE_ENV in Node contexts.
//   isProduction()  — inverse. Running from a packed .crx / store-installed extension.
//   isTesting()     — true when BXM's test framework is running this process. Set by
//                     BXM's test runners (BXM_TEST_MODE=true) and consumer test setups
//                     that want the same signal.
//
// Use these whenever behavior should differ by *what kind of process* you're in —
// shorter timeouts in tests, DevTools menu items only in dev, prompts suppressed in
// tests. Don't use them for "should we hit dev or prod backends" — that's a config
// concern; use `getEnvironment()` for that (in build.js).
//
// Context caveat: in build-time Node (gulp / CLI), `chrome` is undefined. We detect
// via `typeof chrome` so the same code works in every context. In test mode the
// browser-side check is short-circuited via BXM_TEST_MODE so `isDevelopment()`
// returns a stable value regardless of which test layer is running.

function isDevelopment() {
  // Browser-side: rely on `update_url` being absent for unpacked extensions.
  // (Store-installed extensions have `update_url` set to clients2.google.com / similar.)
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
    try {
      const manifest = chrome.runtime.getManifest();
      return !manifest.update_url;
    } catch (_) { /* fall through */ }
  }
  // Node / build-time fallback.
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.BXM_BUILD_MODE === 'true') return false;
  if (this && this.config && this.config.bxm && this.config.bxm.environment === 'development') return true;
  return false;
}

function isProduction() {
  return !this.isDevelopment();
}

function isTesting() {
  // Canonical signal — set by BXM's test runners and consumer test setups alike.
  // Works in Node (process.env) AND in extension contexts (the harness extension
  // sets globalThis.BXM_TEST_MODE before any consumer code runs).
  if (typeof process !== 'undefined' && process.env && process.env.BXM_TEST_MODE === 'true') return true;
  if (typeof globalThis !== 'undefined' && globalThis.BXM_TEST_MODE === true) return true;
  return false;
}

// `getVersion()` — returns the extension's version string.
//   1. `chrome.runtime.getManifest().version` when running inside an extension context.
//   2. `<cwd>/package.json#version` for build-time scripts.
//   3. null when neither resolves.
function getVersion() {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
    try {
      return chrome.runtime.getManifest().version || null;
    } catch (_) { /* fall through */ }
  }
  try {
    const path = require('path');
    const pkg = require(path.join(process.cwd(), 'package.json'));
    return pkg.version || null;
  } catch (_) {
    return null;
  }
}

// Mix the helpers into a Manager constructor's prototype + the constructor itself
// (so `Manager.isTesting()` works statically too, matching BEM/EM pattern).
function attachTo(Manager) {
  Manager.prototype.isDevelopment = isDevelopment;
  Manager.prototype.isProduction  = isProduction;
  Manager.prototype.isTesting     = isTesting;
  Manager.prototype.getVersion    = getVersion;
  Manager.isDevelopment = isDevelopment;
  Manager.isProduction  = isProduction;
  Manager.isTesting     = isTesting;
  Manager.getVersion    = getVersion;
}

module.exports = {
  attachTo,
  isDevelopment,
  isProduction,
  isTesting,
  getVersion,
};
