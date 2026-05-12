// Build-layer test for lib/extension.js — verifies the safe-fallback behavior.
// When `chrome` / `window` / `browser` globals are absent (Node context), the
// module's per-API try/catch blocks must swallow the ReferenceError and leave
// every API property set to null. This is how the same module imports cleanly
// in background SW, content scripts, AND build-time Node tooling.

const path = require('path');

const ext = require(path.join(__dirname, '..', '..', '..', 'lib', 'extension.js'));

module.exports = {
  type: 'group',
  layer: 'build',
  description: 'lib/extension — safe-fallback in Node context',
  tests: [
    {
      name: 'module exports an object',
      run: (ctx) => {
        ctx.expect(typeof ext).toBe('object');
        ctx.expect(ext).not.toBeNull();
      },
    },
    {
      name: 'common API slots are null when no chrome global is present',
      run: (ctx) => {
        ctx.expect(ext.runtime).toBeNull();
        ctx.expect(ext.storage).toBeNull();
        ctx.expect(ext.tabs).toBeNull();
        ctx.expect(ext.action).toBeNull();
      },
    },
    {
      name: 'requiring the module did not throw (smoke)',
      run: (ctx) => {
        // The fact that we reached this test means require() didn't throw —
        // record an explicit pass so the suite output documents the property.
        ctx.expect(true).toBe(true);
      },
    },
  ],
};
