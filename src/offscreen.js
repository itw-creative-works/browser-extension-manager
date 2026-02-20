// Libraries
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';

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

// Export
export default Manager;
