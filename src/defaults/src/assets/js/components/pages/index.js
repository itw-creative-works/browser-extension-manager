// ============================================
// Index Page (Main Extension Page)
// ============================================

// Import Browser Extension Manager
import Manager from 'browser-extension-manager/page';

// Create instance
const manager = new Manager();

// Initialize
manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, messenger, logger, webManager } = manager;

  // Add your project-specific page logic here
  // ...

  // Log the initialization
  logger.log('Index page initialized!');
});
