// Build-layer test that every entry in package.json#exports is require()-able from
// the built dist/ tree (or src/ if dist hasn't been built yet — the test resolves
// relative to whichever directory THIS file lives in).
//
// The dist/ paths in package.json#exports point to dist/foo.js — when running the
// test framework, this file IS the one shipped into dist/test/suites/build/exports.test.js,
// so the relative path back to dist root via `../../../..` lands at <bxm>/dist, and
// each export key resolves correctly.

const path = require('path');

// Each export key (e.g. './main' / './lib/logger-lite') maps to a relative dist path.
// We strip the './dist/' prefix and resolve against `<bxm>/dist` (this file's grandparent
// chain: dist/test/suites/build → ../../../ → dist).
const BXM_ROOT_FROM_SUITE = path.resolve(__dirname, '..', '..', '..', '..');
const DIST_ROOT           = path.resolve(__dirname, '..', '..', '..');
const pkg = require(path.join(BXM_ROOT_FROM_SUITE, 'package.json'));

// Browser-context modules can't be plain-required from Node (they touch chrome.* /
// window.* without try/catch around the top-level usage). Skip those — the build-layer
// only asserts the "node-safe" surface of BXM. Browser-context modules are exercised
// by the background/view test layers.
const BROWSER_CONTEXT_KEYS = new Set([
  '.',
  './background',
  './content',
  './popup',
  './sidepanel',
  './options',
  './page',
  './offscreen',
]);

module.exports = {
  type: 'group',
  layer: 'build',
  description: 'package.json#exports — node-safe entries resolve',
  tests: Object.entries(pkg.exports || {})
    .filter(([key]) => !BROWSER_CONTEXT_KEYS.has(key))
    .map(([key, relDistPath]) => ({
      name: `${key} → ${relDistPath}`,
      run: (ctx) => {
        // relDistPath looks like "./dist/lib/logger-lite.js" — strip the leading
        // "./dist/" and resolve against the suite's actual dist root.
        const rel = relDistPath.replace(/^\.\/dist\//, '');
        const abs = path.join(DIST_ROOT, rel);
        delete require.cache[abs];
        const mod = require(abs);
        ctx.expect(mod).toBeDefined();
      },
    })),
};
