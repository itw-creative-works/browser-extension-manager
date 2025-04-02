// Init service worker
const serviceWorker = self;

// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager/background'));

// Initialize
Manager.initialize()
.then(() => {
  Manager.log('Initialized');
});
