// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager/content'));

// Initialize
Manager.initialize()
.then(() => {
  Manager.log('Initialized');
});
