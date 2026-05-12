// BXM fixture consumer — pretends to be a real BXM-based extension's background.
// Boot tests verify this SW comes up cleanly and exposes a couple of probe hooks.

globalThis.__bxmFixtureBooted = true;
globalThis.__bxmFixtureBootedAt = Date.now();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'fixture:hello') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }
  return false;
});

console.log('[bxm-fixture] background ready');
