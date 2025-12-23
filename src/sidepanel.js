// Libraries
import { Manager as WebManager } from 'web-manager';
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';
import { syncWithBackground, setupAuthBroadcastListener, setupSignOutListener, setupAuthEventListeners, openAuthPage as openAuthPageHelper } from './lib/auth-helpers.js';

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
    this.logger = new LoggerLite('sidepanel');
    this.webManager = new WebManager();

    // Initialize
    await this.webManager.initialize(configuration);

    // Set up auth state listener (updates bindings with user/account state)
    this.webManager.auth().listen((state) => {
      this.logger.log('Auth state changed:', state);
    });

    // Sync auth with background.js (waits for WM auth to settle first)
    await syncWithBackground(this);

    // Set up broadcast listener for sign-in/sign-out from background
    setupAuthBroadcastListener(this);

    // Set up sign-out listener to notify background when user signs out
    setupSignOutListener(this);

    // Set up auth event listeners (sign in, account buttons)
    setupAuthEventListeners(this);

    // Log
    this.logger.log('Initialized!', this);

    // Return manager instance
    return this;
  }

  // Open auth page in new tab (for signing in via website)
  openAuthPage(options = {}) {
    openAuthPageHelper(this, options);
  }
}

// Export
export default Manager;
