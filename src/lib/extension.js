// APIs
const apis = [
  'action',
  'alarms',
  'bookmarks',
  'browsingData',
  'browserAction',
  'commands',
  'contentSettings',
  'contextMenus',
  'cookies',
  'downloads',
  'events',
  'extension',
  'extensionTypes',
  'history',
  'i18n',
  'identity',
  'idle',
  'management',
  'notifications',
  'pageAction',
  'permissions',
  'privacy',
  'proxy',
  'runtime',
  'scripting',
  'sidePanel',
  'storage',
  'tabs',
  'topSites',
  'tts',
  'wallpaper',
  'webNavigation',
  'webRequest',
  'windows'
]

// Class
function Extension () {
  const self = this;

  // Loop through the APIs and assign them to the object
  apis.forEach(function (api) {
    // Initialize the API to null
    self[api] = null;

    // Try chrome
    try {
      if (chrome[api]) {
        self[api] = chrome[api];
      }
    } catch (e) {}

    // Try window
    try {
      if (window[api]) {
        self[api] = window[api];
      }
    } catch (e) {}


    // Try browser
    try {
      if (browser[api]) {
        self[api] = browser[api];
      }
    } catch (e) {}

    // Try browser.extension
    try {
      self.api = browser.extension[api]
    } catch (e) {}
  })

  // Try to get the runtime
  try {
    if (browser && browser.runtime) {
      self.runtime = browser.runtime
    }
  } catch (e) {}

  // Try to get the browserAction
  try {
    if (browser && browser.browserAction) {
      self.browserAction = browser.browserAction
    }
  } catch (e) {}

  // Fix storage
  if (self.storage) {
    if (self.storage.sync) {
      self.storage = self.storage.sync
    } else if (self.storage.local) {
      self.storage = self.storage.local
    }
  }

  // Return the object
  return self;
}

// Export
module.exports = new Extension();
