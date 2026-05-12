// BXM test-harness background service worker.
//
// This SW does ONE job: stay alive long enough for the chromium runner to attach
// a CDP session and inject test code via Runtime.evaluate. The runner discovers
// this SW via Puppeteer's service-worker target API, then drives test execution
// directly from the parent Node process — this file is intentionally minimal.
//
// We set a couple of globals the injected test code can rely on:
//   globalThis.BXM_TEST_MODE — picked up by Manager.isTesting()
//   globalThis.__bxmTestEmit — defined by the runner before each test;
//                              used by injected code to report results
//
// We also publish a `chrome.runtime.onMessage` ping handler so view-layer tests
// (running in popup/options/sidepanel tabs) can verify the SW is alive.

globalThis.BXM_TEST_MODE = true;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'bxm:test:ping') {
    sendResponse({ pong: true, ts: Date.now() });
    return false; // sync response
  }
  return false;
});

console.log('[bxm-harness] service worker ready');
