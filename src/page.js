// Libraries
import { Manager as WebManager } from 'web-manager';
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';

// Import theme (exposes Bootstrap to window.bootstrap)
import '__theme__/_theme.js';

// Class
class Manager {
  constructor() {
    // Properties
    this.extension = null;
    this.messenger = null;
    this.logger = null;
    this.webManager = null;
  }

  async initialize() {
    // Configuration
    const configuration = window.BEM_BUILD_JSON?.config;

    // Set properties
    this.extension = extension;
    this.messenger = null;
    this.logger = new LoggerLite('page');
    this.webManager = new WebManager();

    // Initialize
    await this.webManager.initialize(configuration);

    // Log
    this.logger.log('Initialized!', this);

    // Return manager instance
    return this;
  }
}

// Export
export default Manager;
