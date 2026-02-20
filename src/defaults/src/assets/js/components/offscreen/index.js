// ============================================
// Offscreen Component
// ============================================
// Persistent offscreen document for background operations
// (WebSocket connections, long-running tasks, etc.)

// Import Browser Extension Manager
import Manager from 'browser-extension-manager/offscreen';

// Create instance
const manager = new Manager();

// Initialize
manager.initialize()
.then(() => {
  // Shortcuts
  const { extension, logger } = manager;

  // Add your project-specific offscreen logic here
  // This document is invisible and persists in the background
  // ...

  // Log the initialization
  logger.log('Offscreen initialized!');
});