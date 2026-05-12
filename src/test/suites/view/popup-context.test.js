// View-layer smoke for the popup page. Verifies the test code is executing
// inside a tab that has loaded popup.html (chrome-extension://<id>/popup.html),
// has DOM + chrome.* APIs, and matches the harness's expected page shape.

module.exports = {
  type: 'suite',
  layer: 'view',
  context: 'popup',
  description: 'view/popup — DOM + chrome surface',
  tests: [
    {
      name: 'document is present and body has data-bxm-context="popup"',
      run: async (ctx) => {
        ctx.expect(typeof document).toBe('object');
        ctx.expect(document.body.dataset.bxmContext).toBe('popup');
      },
    },
    {
      name: 'page title matches the harness popup.html',
      run: async (ctx) => {
        ctx.expect(document.title).toContain('Popup');
      },
    },
    {
      name: 'chrome.* APIs are exposed in extension-page context',
      run: async (ctx) => {
        ctx.expect(typeof chrome).toBe('object');
        ctx.expect(typeof chrome.runtime).toBe('object');
        ctx.expect(typeof chrome.runtime.id).toBe('string');
        ctx.expect(typeof chrome.storage).toBe('object');
      },
    },
    {
      name: 'window globals (fetch, URL) are available',
      run: async (ctx) => {
        ctx.expect(typeof fetch).toBe('function');
        ctx.expect(typeof URL).toBe('function');
        const u = new URL('https://example.com/path?q=1');
        ctx.expect(u.searchParams.get('q')).toBe('1');
      },
    },
    {
      name: 'popup ↔ background messaging round-trip',
      run: async (ctx) => {
        const reply = await chrome.runtime.sendMessage({ type: 'bxm:test:ping' });
        ctx.expect(reply.pong).toBe(true);
        ctx.expect(typeof reply.ts).toBe('number');
      },
    },
  ],
};
