// Import the Ultimate Extension Manager
const Manager = new (require('browser-extension-manager'));

// Import themes
const bootstrap = require('/node_modules/browser-extension-manager/dist/assets/themes/bootstrap/5.3.3/js/bootstrap.bundle.js');

// Initialize
Manager.initialize(() => {
  console.log('Initialized');
})
