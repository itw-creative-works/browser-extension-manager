// ============================================
// Popup Component
// ============================================

// Import Browser Extension Manager
import Manager from 'browser-extension-manager/popup';

// Create instance
const manager = new Manager();

// Initialize
manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, messenger, logger, webManager } = manager;

  // Add your project-specific popup logic here
  // ...

  // Log the initialization
  logger.log('Popup initialized!');
});
