// Boot-layer test — verifies Chromium can load BXM's fixture consumer
// extension as unpacked, the manifest validates, the SW comes up, and the
// popup renders end-to-end. This is the integration equivalent to "did the
// real consumer extension start without throwing".
//
// In BXM's own test run, BXM_TEST_BOOT_PROJECT points at the fixture under
// src/test/fixtures/consumer-extension. In a real consumer's `npx mgr test`
// run, the env var is unset and boot tests target the consumer's own
// `<cwd>/dist/`.

module.exports = {
  type: 'group',
  layer: 'boot',
  description: 'fixture consumer — extension loads + boots',
  tests: [
    {
      description: 'extension has a valid ID and MV3 manifest',
      inspect: async ({ extension, expect }) => {
        expect(extension.id).toMatch(/^[a-z]{32}$/);
        expect(extension.manifest.manifest_version).toBe(3);
        expect(extension.manifest.name).toBe('BXM Fixture Consumer');
      },
    },
    {
      description: 'manifest exposes a popup URL',
      inspect: async ({ extension, expect }) => {
        expect(extension.popupUrl).toMatch(/^chrome-extension:\/\/[a-z]{32}\/popup\.html$/);
      },
    },
    {
      description: 'service worker target was discovered',
      inspect: async ({ extension, expect }) => {
        expect(extension.swTarget).not.toBeNull();
        expect(extension.swTarget.type()).toBe('service_worker');
      },
    },
    {
      description: 'popup.html renders with the expected #main-content element',
      inspect: async ({ extension, page, expect }) => {
        await page.goto(extension.popupUrl, { waitUntil: 'domcontentloaded' });
        const text = await page.$eval('#main-content', (el) => el.textContent);
        expect(text).toContain('Fixture Popup');
      },
    },
    {
      description: 'background SW responded to a probe message',
      inspect: async ({ extension, page, expect }) => {
        // Open any page that has chrome.runtime access — popup works.
        await page.goto(extension.popupUrl, { waitUntil: 'domcontentloaded' });
        const reply = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'fixture:hello' }));
        expect(reply.ok).toBe(true);
        expect(reply.version).toBe('0.1.0');
      },
    },
  ],
};
