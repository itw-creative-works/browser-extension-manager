// Libraries
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';

// Firebase (static imports - dynamic import() doesn't work in service workers with webpack chunking)
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// Variables
const serviceWorker = self;

// Import build config at the top level (synchronous)
importScripts('/build.js');

// ⚠️⚠️⚠️ CRITICAL: Setup global listeners BEFORE any async operations ⚠️⚠️⚠️
// https://stackoverflow.com/questions/78270541/cant-catch-fcm-notificationclick-event-in-service-worker-using-firebase-messa
// Note: ES6 static imports above are fine - they're hoisted and bundled by webpack.
// The issue is with importScripts() calls which must be synchronous at top-level.
setupGlobalHandlers();

// Class
class Manager {
  constructor() {
    // Properties
    this.extension = null;
    this.logger = null;
    this.serviceWorker = null;

    // Load config from build.js
    this.config = serviceWorker.BEM_BUILD_JSON?.config || {};

    // Defaults
    this.version = this.config?.version || 'unknown';
    this.brand = this.config?.brand || { name: 'unknown' };
    this.app = this.config?.app?.id || 'extension';
    this.environment = this.config?.bem?.environment || 'production';
    this.libraries = {
      firebase: null,
      firebaseAuth: null,
      messaging: false,
      promoServer: false,
    };
    this.cache = {
      breaker: this.config?.bem?.cache_breaker || new Date().getTime(),
      name: ''
    };
  }

  // Initialize
  async initialize() {
    // Set properties
    this.extension = extension;
    this.logger = new LoggerLite('background');
    this.serviceWorker = serviceWorker;

    // Parse config file
    this.parseConfiguration();

    // Setup instance-specific message handlers
    this.setupInstanceHandlers();

    // Initialize Firebase
    this.initializeFirebase();

    // Setup auth token listener (for cross-runtime auth)
    this.setupAuthTokenListener();

    // Setup auth storage listener (detect sign-out from pages)
    this.setupAuthStorageListener();

    // Setup livereload
    this.setupLiveReload();

    // Log
    this.logger.log('Initialized!', this.version, this.cache.name, this);
    this.logger.log('Config loaded from BEM_BUILD_JSON:', this.config);

    // Return manager instance
    return this;
  }

  // Parse configuration
  parseConfiguration() {
    try {
      // Set cache name
      this.cache.name = `${this.app}-${this.cache.breaker}`;
    } catch (e) {
      this.logger.error('Error parsing configuration', e);
    }
  }

  // Setup instance-specific message handlers
  setupInstanceHandlers() {
    // Send messages: https://stackoverflow.com/questions/35725594/how-do-i-pass-data-like-a-user-id-to-a-web-worker-for-fetching-additional-push
    // more messaging: http://craig-russell.co.uk/2016/01/29/background-messaging.html#.XSKpRZNKiL8
    serviceWorker.addEventListener('message', (event) => {
      // Get the data
      const data = event.data || {};

      // Parse the data
      const command = data.command || '';
      const payload = data.payload || {};

      // Quit if no command
      if (!command) return;

      // Log
      this.logger.log('message', command, payload, event);

      // Handle commands
      if (command === 'update-cache') {
        const pages = payload.pages || [];
        this.updateCache(pages)
          .then(() => {
            event.ports[0]?.postMessage({ status: 'success' });
          })
          .catch(error => {
            event.ports[0]?.postMessage({ status: 'error', error: error.message });
          });
      }
    });

    // Log
    this.logger.log('Set up message handlers');
  }

  // Initialize Firebase
  initializeFirebase() {
    // Get Firebase config
    const firebaseConfig = this.config?.web_manager?.firebase?.app?.config;

    // Check if Firebase config is available
    if (!firebaseConfig) {
      this.logger.log('Firebase config not available yet, skipping Firebase initialization');
      return;
    }

    // Check if already initialized
    if (this.libraries.firebase) {
      this.logger.log('Firebase already initialized');
      return;
    }

    // Log
    this.logger.log('Initializing Firebase');

    // Initialize app (libraries were already imported at the top if uncommented)
    // firebase.initializeApp(firebaseConfig);

    // Initialize messaging
    // this.libraries.messaging = firebase.messaging();

    // Attach firebase to Manager
    // this.libraries.firebase = firebase;
  }

  // Update cache
  updateCache(pages) {
    // Set default pages to cache
    const defaults = [
      '/',
      '/assets/css/main.bundle.css',
      '/assets/js/main.bundle.js',
    ];

    // Ensure pages is an array
    pages = pages || [];

    // Merge with additional pages
    const pagesToCache = [...new Set([...defaults, ...pages])];

    // Open cache and add pages
    return caches.open(this.cache.name)
      .then(cache => cache.addAll(pagesToCache))
      .then(() => this.logger.log('Cached resources:', pagesToCache))
      .catch(error => this.logger.error('Failed to cache resources:', error));
  }

  // Setup auth token listener (monitors tabs for auth tokens from website)
  setupAuthTokenListener() {
    // DEBUG: Log the full config to see what we have
    console.log('[AUTH] setupAuthTokenListener called');
    console.log('[AUTH] this.config:', this.config);
    console.log('[AUTH] BEM_BUILD_JSON:', serviceWorker.BEM_BUILD_JSON);

    // Get auth domain from config
    // Structure is: this.config.firebase.app.config.authDomain
    const authDomain = this.config?.firebase?.app?.config?.authDomain;

    // Log config for debugging
    this.logger.log('[AUTH] Config paths:', {
      firebase_path: this.config?.firebase?.app?.config?.authDomain,
      resolved: authDomain,
    });

    // Skip if no auth domain configured
    if (!authDomain) {
      this.logger.log('[AUTH] No authDomain configured, skipping auth token listener');
      return;
    }

    // Log
    this.logger.log(`[AUTH] Setting up auth token listener for domain: ${authDomain}`);

    // Listen for tab URL changes
    this.extension.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process when URL changes and is complete
      if (changeInfo.status !== 'complete' || !tab.url) {
        return;
      }

      // Parse the URL
      let tabUrl;
      try {
        tabUrl = new URL(tab.url);
      } catch (e) {
        return;
      }

      // Log every tab update for auth domain matching
      this.logger.log(`[AUTH] Tab updated: ${tabUrl.hostname} (looking for: ${authDomain})`);

      // Check if this is our auth domain
      if (tabUrl.hostname !== authDomain) {
        return;
      }

      // Log - we found our domain
      this.logger.log(`[AUTH] Auth domain matched! Checking for authToken param...`);

      // Check for authToken param
      const authToken = tabUrl.searchParams.get('authToken');
      if (!authToken) {
        this.logger.log(`[AUTH] No authToken param found in URL: ${tabUrl.href}`);
        return;
      }

      // Get source tab ID to restore after auth
      const authSourceTabId = tabUrl.searchParams.get('authSourceTabId');

      // Log
      this.logger.log('[AUTH] Auth token detected in tab:', tabId);

      // Handle the auth token
      this.handleAuthToken(authToken, tabId, authSourceTabId ? parseInt(authSourceTabId, 10) : null);
    });
  }

  // Setup auth storage listener (detect sign-out from pages)
  setupAuthStorageListener() {
    this.extension.storage.onChanged.addListener((changes) => {
      const authChange = changes['bxm:authState'];
      if (!authChange) {
        return;
      }

      this.logger.log('[AUTH] Storage auth state changed:', authChange.newValue ? 'signed in' : 'signed out');

      // If storage was cleared (sign-out from a page) and we have Firebase initialized, sign out
      if (!authChange.newValue && this.libraries.firebaseAuth) {
        this.logger.log('[AUTH] Signing out background Firebase...');
        this.libraries.firebaseAuth.signOut();
      }
    });

    this.logger.log('[AUTH] Auth storage listener set up');
  }

  // Get or initialize Firebase auth (reuse existing instance)
  getFirebaseAuth() {
    // Return existing instance if available
    if (this.libraries.firebaseAuth) {
      return this.libraries.firebaseAuth;
    }

    // Get Firebase config
    const firebaseConfig = this.config?.firebase?.app?.config;
    if (!firebaseConfig) {
      throw new Error('Firebase config not available');
    }

    // Try to get existing app or create new one
    try {
      this.libraries.firebase = getApp('bxm-auth');
    } catch (e) {
      this.libraries.firebase = initializeApp(firebaseConfig, 'bxm-auth');
    }

    // Get auth and set up state listener (only once)
    this.libraries.firebaseAuth = getAuth(this.libraries.firebase);

    // Set up auth state change listener (background is source of truth)
    onAuthStateChanged(this.libraries.firebaseAuth, (user) => {
      this.handleAuthStateChange(user);
    });

    return this.libraries.firebaseAuth;
  }

  // Handle Firebase auth state changes (source of truth for all contexts)
  async handleAuthStateChange(user) {
    this.logger.log('[AUTH] Auth state changed:', user?.email || 'signed out');

    if (user) {
      // User is signed in - get current stored state to preserve token
      const result = await new Promise(resolve =>
        this.extension.storage.get('bxm:authState', resolve)
      );
      const currentState = result['bxm:authState'] || {};

      // Update auth state with current user info
      const authState = {
        token: currentState.token, // Preserve existing token
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
        },
        timestamp: Date.now(),
      };

      await this.extension.storage.set({ 'bxm:authState': authState });
      this.logger.log('[AUTH] Auth state synced to storage');
    } else {
      // User is signed out - clear storage
      await this.extension.storage.remove('bxm:authState');
      this.logger.log('[AUTH] Auth state cleared from storage');
    }
  }

  // Handle auth token from website
  async handleAuthToken(token, tabId, authSourceTabId = null) {
    try {
      // Log
      this.logger.log('[AUTH] Processing auth token...');

      // Get or initialize Firebase auth
      const auth = this.getFirebaseAuth();

      // Sign in with custom token
      this.logger.log('[AUTH] Calling signInWithCustomToken...');
      const userCredential = await signInWithCustomToken(auth, token);
      const user = userCredential.user;

      // Log
      this.logger.log('[AUTH] Signed in successfully:', user.email);

      // Save token to storage (user state will be synced by onAuthStateChanged)
      const result = await new Promise(resolve =>
        this.extension.storage.get('bxm:authState', resolve)
      );
      const currentState = result['bxm:authState'] || {};

      await this.extension.storage.set({
        'bxm:authState': {
          ...currentState,
          token: token,
          timestamp: Date.now(),
        }
      });

      // Close the auth tab
      await this.extension.tabs.remove(tabId);
      this.logger.log('[AUTH] Auth tab closed');

      // Reactivate the source tab if provided
      if (authSourceTabId) {
        try {
          await this.extension.tabs.update(authSourceTabId, { active: true });
          this.logger.log('[AUTH] Restored source tab:', authSourceTabId);
        } catch (e) {
          // Tab may have been closed, ignore
          this.logger.log('[AUTH] Could not restore source tab (may be closed):', authSourceTabId);
        }
      }

    } catch (error) {
      this.logger.error('[AUTH] Error handling auth token:', error);
    }
  }

  // Setup livereload
  setupLiveReload() {
    // Quit if not in dev mode
    if (this.environment !== 'development') return;

    // Get port from config or use default
    const port = this.config?.bem?.liveReloadPort || 35729;

    // Setup livereload
    const address = `ws://localhost:${port}/livereload`;
    let connection;
    let isReconnecting = false; // Flag to track reconnections

    // Log
    this.logger.log(`Setting up live reload on ${address}...`);

    // Function to establish a connection
    const connect = () => {
      connection = new WebSocket(address);

      // Log connection
      this.logger.log(`Reload connecting to ${address}...`);

      // Log connection errors
      connection.onerror = (e) => {
        this.logger.error('Reload connection got error:', e);
      };

      // Log when set up correctly
      connection.onopen = () => {
        this.logger.log('Reload connection set up!');

        // Reload the extension only on reconnections
        if (isReconnecting) {
          // reload();
        }

        // Reset the reconnection flag
        isReconnecting = false;
      };

      // Handle connection close and attempt to reconnect
      connection.onclose = () => {
        // Set time
        const seconds = 1;

        // Log
        this.logger.log(`Reload connection closed. Attempting to reconnect in ${seconds} second(s)...`);

        // Set the reconnection flag
        isReconnecting = true;

        // Reconnect
        setTimeout(connect, seconds * 1000); // Retry
      };

      // Handle incoming messages
      connection.onmessage = (event) => {
        if (!event.data) {
          return;
        }

        // Get data
        const data = JSON.parse(event.data);

        // Log
        this.logger.log('Reload connection got message:', data);

        // Handle reload command
        if (data && data.command === 'reload') {
          reload();
        }
      };
    };

    const reload = () => {
      this.logger.log('Reloading extension...');
      setTimeout(() => {
        this.extension.runtime.reload();
      }, 1000);
    };

    // Start the initial connection
    connect();
  }
}

// Helper: Setup global listeners
// This is called at top-level before any async operations to ensure listeners are registered first
function setupGlobalHandlers() {
  // Force service worker to use the latest version
  serviceWorker.addEventListener('install', (event) => {
    serviceWorker.skipWaiting();
  });

  serviceWorker.addEventListener('activate', (event) => {
    event.waitUntil(serviceWorker.clients.claim());
  });

  // Handle clicks on notifications
  // ⚠️ MUST be registered before any async operations
  serviceWorker.addEventListener('notificationclick', (event) => {
    // Get the properties of the notification
    const notification = event.notification;
    const data = (notification.data && notification.data.FCM_MSG ? notification.data.FCM_MSG.data : null) || {};
    const payload = (notification.data && notification.data.FCM_MSG ? notification.data.FCM_MSG.notification : null) || {};

    // Get the click action
    const clickAction = payload.click_action || data.click_action || '/';

    // Log
    console.log('notificationclick event', event);
    console.log('notificationclick data', data);
    console.log('notificationclick payload', payload);
    console.log('notificationclick clickAction', clickAction);

    // Handle the click
    event.waitUntil(
      clients.openWindow(clickAction)
    );

    // Close the notification
    notification.close();
  });
}

// Export
export default Manager;
