// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager/content'));

// Initialize
Manager.initialize()
.then(() => {
  // Do other initialization tasks here
  // ...

  // Log the initialization
  Manager.log('Initialized!');
});
