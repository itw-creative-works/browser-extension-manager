// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager'));

// Initialize
Manager.initialize(() => {
  console.log('Initialized');
})
