# Offscreen Component

Offscreen documents persist in the background (unlike service workers, they don't sleep). Use for WebSocket connections, long-running tasks, audio, clipboard — anything an MV3 service worker can't hold.

**Key facts:**

- Only one offscreen document can exist per extension.
- Invisible — no UI, no styling needed.
- Lightweight Manager (no WebManager, no auth, no theme) — see [managers.md](managers.md).
- Must be created programmatically from the background service worker.
- Requires the `offscreen` permission in the manifest (opt-in — see [components.md](components.md)).

## Creating from Background

```javascript
const OFFSCREEN_PATH = 'views/offscreen/index.html';

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });
  return contexts.length > 0;
}

async function setupOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['WEB_RTC'],
    justification: 'Maintain persistent connection',
  });
}
```

## Offscreen ↔ Background Communication

```javascript
// From offscreen → background
chrome.runtime.sendMessage({ action: 'myAction', data: {...} }, (response) => {
  // handle response
});

// From background, listen for offscreen messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'myAction') {
    doSomething(message.data).then(sendResponse);
    return true; // keep channel open for async response
  }
});
```

## See also

- [components.md](components.md) — the seven component contexts + manifest wiring
- [managers.md](managers.md) — lightweight vs full Manager per context
- [extension.md](extension.md) — cross-browser API wrapper
