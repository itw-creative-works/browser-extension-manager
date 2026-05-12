// Public test API — what consumers see.
//
// Test files export a test definition. Three forms:
//
// Standalone:
//   module.exports = {
//     layer: 'build',                  // 'build' | 'background' | 'view' | 'boot'
//     description: 'config has brand.id',
//     timeout: 5000,
//     run: async (ctx) => {
//       const cfg = Manager.getConfig();
//       ctx.expect(cfg.brand.id).toBeTruthy();
//     },
//     cleanup: async (ctx) => { ... },
//   };
//
// Boot layer — spawns Chromium with the consumer's actual built `dist/` loaded as an
// unpacked extension and runs `inspect` against the live extension surface. Replaces
// shell-level smoke tests with deterministic, signal-driven pass/fail. Use this to
// verify the WHOLE integration: consumer scaffolds, brand config, real manifest, real boot.
//
//   module.exports = {
//     layer: 'boot',
//     description: 'extension loads and SW boots',
//     timeout: 20000,
//     inspect: async ({ extension, page, expect, projectRoot }) => {
//       expect(extension.id).toBeTruthy();
//       expect(extension.manifest.manifest_version).toBe(3);
//     },
//   };
//
// Suite (sequential, shared state, stop on first failure):
//   module.exports = {
//     type: 'suite',
//     layer: 'background',
//     description: 'messaging round-trip',
//     tests: [
//       { name: 'send',  run: async (ctx) => { ctx.state.echo = await chrome.runtime.sendMessage({ ping: 1 }); } },
//       { name: 'reply', run: async (ctx) => { ctx.expect(ctx.state.echo.pong).toBe(1); } },
//     ],
//   };
//
// Group (sequential, shared state, runs ALL tests even if some fail):
//   module.exports = {
//     type: 'group',
//     layer: 'build',
//     tests: [ ... ],
//   };
//
// Array form (treated as group):
//   module.exports = [ { name, run }, ... ];
//
// The ctx (context) provided to every run/cleanup includes:
//   - ctx.expect       — Jest-compatible assertion library
//   - ctx.state        — shared object across tests in a suite/group
//   - ctx.skip(reason) — throw to skip the current test at runtime
//   - ctx.layer        — current layer name
//   - ctx.manager      — BXM Manager instance (background / view layers only)
//   - ctx.page         — Puppeteer Page (view layer only)

module.exports = {
  expect: require('./assert.js'),
};
