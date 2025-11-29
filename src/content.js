// Libraries
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';
import Affiliatizer from './lib/affiliatizer.js';

// Class
class Manager {
  constructor() {
    // Properties
    this.extension = null;
    this.messenger = null;
    this.logger = null;
    this.affiliatizer = null;
  }

  async initialize() {
    // Set properties
    this.extension = extension;
    this.messenger = null;
    this.logger = new LoggerLite('content');
    this.affiliatizer = Affiliatizer.initialize(this);

    // Log
    this.logger.log('Initialized!', this);

    // Return manager instance
    return this;
  }
}

// Export
export default Manager;
