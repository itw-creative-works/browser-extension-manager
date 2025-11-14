// Libraries
import { Manager as WebManager } from 'web-manager';
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';

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
    this.logger = new LoggerLite('options');
    this.webManager = new WebManager();

    // Initialize
    await this.webManager.initialize(configuration);

    // Return manager instance
    return this;
  }

  library(name) {
    // Dynamic import for libraries
    return import(`./lib/${name}.js`);
  }
}

// Export
export default Manager;
