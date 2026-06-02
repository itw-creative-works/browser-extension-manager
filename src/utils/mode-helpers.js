// Runtime mode helpers (BEM/EM/UJM-pattern), shared across BXM's eight context Managers
// (build / background / popup / options / content / sidepanel / page / offscreen).
//
// `getEnvironment()` is the SINGLE SOURCE OF TRUTH: it is the ONLY function that reads the
// raw signals (BXM_TEST_MODE / manifest.update_url / BXM_BUILD_MODE / NODE_ENV /
// config.bxm.environment) and resolves them to exactly ONE of three mutually-exclusive
// values. The three is*() checks DERIVE from it — they never read raw signals themselves,
// so they can never disagree with getEnvironment().
//
//   isDevelopment() — `getEnvironment() === 'development'`: running unpacked from disk (an
//                     unpacked extension via chrome://extensions or a dev build), and NOT
//                     testing.
//   isTesting()     — `getEnvironment() === 'testing'`: BXM's test framework is running this
//                     process (BXM_TEST_MODE=true). TAKES PRECEDENCE — a test run is not dev.
//   isProduction()  — `getEnvironment() === 'production'`: running from a packed .crx /
//                     store-installed extension, and NOT testing. A real positive check —
//                     NOT `!isDevelopment()`.
//
// To gate "anything non-production" use `!isProduction()` or `isDevelopment() ||
// isTesting()` intentionally — never assume two values.
//
// Context caveat: in build-time Node (gulp / CLI), `chrome` is undefined. getEnvironment()
// detects via `typeof chrome` so the same code works in every context. Browser detection
// uses `chrome.runtime.getManifest().update_url` — packed store extensions have one,
// unpacked ones do not.

// getEnvironment() — the SINGLE SOURCE OF TRUTH. Reads every raw signal and resolves to
// exactly ONE of 'development' | 'testing' | 'production' (mutually exclusive; testing wins).
// Precedence: testing → production → development.
function getEnvironment() {
  // 1. Testing wins — set by BXM's test runners / harness, or a testing-baked build.
  //    Works in Node (process.env), extension contexts (globalThis set before consumer JS),
  //    and config-baked builds (config.bxm.environment === 'testing').
  if (typeof process !== 'undefined' && process.env && process.env.BXM_TEST_MODE === 'true') return 'testing';
  if (typeof globalThis !== 'undefined' && globalThis.BXM_TEST_MODE === true) return 'testing';
  if (this && this.config && this.config.bxm && this.config.bxm.environment === 'testing') return 'testing';

  // 2. Browser-side: packed/store extensions have `update_url`; unpacked ones do not.
  //    This is the authoritative runtime signal in an extension context.
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
    try {
      return chrome.runtime.getManifest().update_url ? 'production' : 'development';
    } catch (_) { /* fall through to Node/config signals */ }
  }

  // 3. Node / build-time + config signals.
  if (process.env.BXM_BUILD_MODE === 'true') return 'production';
  if (process.env.NODE_ENV === 'development') return 'development';
  if (this && this.config && this.config.bxm && this.config.bxm.environment === 'development') return 'development';
  if (this && this.config && this.config.bxm && this.config.bxm.environment === 'production') return 'production';

  // 4. Default: development. BXM's deployed artifacts ALWAYS carry their signal — a packed /
  //    store extension has `manifest.update_url`, and build-time Node sets BXM_BUILD_MODE. So
  //    reaching here means a bare tooling / unpacked context, where development is the sensible
  //    answer. (Contrast BEM/EM, whose deployed RUNTIME can legitimately lack a signal, so they
  //    default to production.)
  return 'development';
}

// The three checks DERIVE from getEnvironment() — they never read raw signals, so they can
// never disagree with it. isDevelopment() is NOT true in testing; isProduction() is a real
// positive check (never `!isDevelopment()`).
function isDevelopment() {
  return getEnvironment.call(this) === 'development';
}

function isProduction() {
  return getEnvironment.call(this) === 'production';
}

function isTesting() {
  return getEnvironment.call(this) === 'testing';
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
// (so `Manager.isTesting()` works statically too, matching BEM/EM/UJM pattern).
// getEnvironment() is the SSOT and is attached here too — build.js no longer defines it.
function attachTo(Manager) {
  Manager.prototype.getEnvironment = getEnvironment;
  Manager.prototype.isDevelopment  = isDevelopment;
  Manager.prototype.isProduction   = isProduction;
  Manager.prototype.isTesting      = isTesting;
  Manager.prototype.getVersion     = getVersion;
  Manager.getEnvironment = getEnvironment;
  Manager.isDevelopment  = isDevelopment;
  Manager.isProduction   = isProduction;
  Manager.isTesting      = isTesting;
  Manager.getVersion     = getVersion;
}

module.exports = {
  attachTo,
  getEnvironment,
  isDevelopment,
  isProduction,
  isTesting,
  getVersion,
};
