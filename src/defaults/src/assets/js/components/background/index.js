// ============================================
// Background Component (Service Worker)
// ============================================

// Import Browser Extension Manager
import Manager from 'browser-extension-manager/background';

// Create instance
const manager = new Manager();

// Initialize
manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, logger, webManager } = manager;

  // Add your project-specific background logic here
  // ...

  // Log the initialization
  logger.log('Background initialized!');
});
