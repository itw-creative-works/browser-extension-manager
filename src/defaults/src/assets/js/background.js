// Init service worker
const serviceWorker = self;

// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager/background'));

// Initialize
Manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, messenger, logger } = Manager;

  // Do other initialization tasks here
  // ...

  // Log the initialization
  logger.log('Initialized!');
});
