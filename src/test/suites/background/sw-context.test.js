// Background-layer smoke — verifies the test harness actually executes
// inside a real MV3 service worker context with `chrome` + `self` globals
// wired up. If this fails, no other background-layer test can be trusted.

module.exports = {
  type: 'suite',
  layer: 'background',
  description: 'background SW — context smoke',
  tests: [
    {
      name: 'chrome global is defined',
      run: async (ctx) => {
        ctx.expect(typeof chrome).toBe('object');
        ctx.expect(chrome).not.toBeNull();
      },
    },
    {
      name: 'chrome.runtime.id is a non-empty string',
      run: async (ctx) => {
        ctx.expect(typeof chrome.runtime.id).toBe('string');
        ctx.expect(chrome.runtime.id.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'chrome.runtime.getManifest reports manifest_version 3',
      run: async (ctx) => {
        const m = chrome.runtime.getManifest();
        ctx.expect(m.manifest_version).toBe(3);
        ctx.expect(m.name).toBe('BXM Test Harness');
      },
    },
    {
      name: 'BXM_TEST_MODE is wired on globalThis (harness sets it on boot)',
      run: async (ctx) => {
        ctx.expect(globalThis.BXM_TEST_MODE).toBe(true);
      },
    },
    {
      name: 'service worker globals (self, fetch, Promise) are present',
      run: async (ctx) => {
        ctx.expect(typeof self).toBe('object');
        ctx.expect(typeof fetch).toBe('function');
        ctx.expect(typeof Promise).toBe('function');
      },
    },
  ],
};
