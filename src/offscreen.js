// Libraries
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';
import { attachTo as attachModeHelpers } from './utils/mode-helpers.js';

// Class
class Manager {
  constructor() {
    // Properties
    this.extension = null;
    this.logger = null;
  }

  async initialize() {
    // Set properties
    this.extension = extension;
    this.logger = new LoggerLite('offscreen');

    // Log
    this.logger.log('Initialized!', this);

    // Return manager instance
    return this;
  }
}

// Cross-context helpers — Manager.isTesting() / isDevelopment() / etc.
attachModeHelpers(Manager);

// Export
export default Manager;
