// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager/content'));

// Initialize
Manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, logger, affiliatizer } = Manager;

  // Do other initialization tasks here
  // ...

  // Log the initialization
  logger.log('Initialized!');
});
