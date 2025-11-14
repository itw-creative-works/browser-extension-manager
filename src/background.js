// Libraries
import extension from './lib/extension.js';
import LoggerLite from './lib/logger-lite.js';

// Variables
const serviceWorker = self;

// Import build config at the top level (synchronous)
importScripts('/build.js');

// ⚠️⚠️⚠️ CRITICAL: Setup global listeners BEFORE importing Firebase ⚠️⚠️⚠️
// https://stackoverflow.com/questions/78270541/cant-catch-fcm-notificationclick-event-in-service-worker-using-firebase-messa
setupGlobalHandlers();

// Import Firebase libraries at the top level (before any async operations)
// ⚠️ importScripts MUST be called at top-level (synchronously) - it cannot be called inside functions or after async operations
// importScripts(
//   'https://www.gstatic.com/firebasejs/%%% firebaseVersion %%%/firebase-app-compat.js',
//   'https://www.gstatic.com/firebasejs/%%% firebaseVersion %%%/firebase-messaging-compat.js',
// );

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
      firebase: false,
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

      this.logger.log('Parsed configuration', this.config);
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
