// Libraries

// Variables
const serviceWorker = self;

// Class
function Manager() {
  const self = this;

  // Properties
  self.extension = null;

  // Defaults
  self.config = {};
  self.version = '{ version }';
  self.brand = {
    name: '{ brand.name }',
  };
  self.app = '{ app.id }';
  self.environment = '{ environment }';
  self.libraries = {
    firebase: false,
    messaging: false,
    promoServer: false,
    cachePolyfill: false,
  };
  self.cache = {
    breaker: '',
    name: ''
  };

  // Return
  return self;
}

// Initialize
Manager.prototype.initialize = function () {
  const self = this;

  return new Promise(function(resolve, reject) {
    // Properties
    self.extension = require('./lib/extension');

    // Parse config file
    parseConfiguration(self);

    // Setup listeners
    setupListeners(self);

    // Import firebase
    // importFirebase(self);

    // Setup livereload
    setupLiveReload(self);

    // Log
    self.log('Initialized!', self.version, self.cache.name, self);

    // Return
    return resolve(self);
  });
};

// Setup logger
['log', 'error', 'warn', 'info', 'debug'].forEach(method => {
  Manager.prototype[method] = function() {
    // Get arguments
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Add prefix
    const args = [`[${time}] background:`, ...Array.from(arguments)];

    // Call the original console method
    console[method].apply(console, args);
  };
});

// Parse configuration
function parseConfiguration(self) {
  try {
    // Log
    self.cache.breaker = new Date().getTime();
    self.cache.name = `${self.app}-${self.cache.breaker}`;

    self.log('Parsed configuration', self.config);
  } catch (e) {
    self.error('Error parsing configuration', e);
  }
}

// Setup listeners
function setupListeners(self) {
  // Force service worker to use the latest version
  serviceWorker.addEventListener('install', (event) => {
    event.waitUntil(serviceWorker.skipWaiting());
  });

  serviceWorker.addEventListener('activate', (event) => {
    event.waitUntil(serviceWorker.clients.claim());
  });

  // Handle clicks on notifications
  // Open the URL of the notification
  // ⚠️⚠️⚠️ THIS MUST BE PLACED BEFORE THE FIREBASE IMPORTS HANDLER ⚠️⚠️⚠️
  // https://stackoverflow.com/questions/78270541/cant-catch-fcm-notificationclick-event-in-background-using-firebase-messa
  serviceWorker.addEventListener('notificationclick', (event) => {
    // Get the properties of the notification
    const notification = event.notification;
    const data = (notification.data && notification.data.FCM_MSG ? notification.data.FCM_MSG.data : null) || {};
    const payload = (notification.data && notification.data.FCM_MSG ? notification.data.FCM_MSG.notification : null) || {};

    // Get the click action
    const clickAction = payload.click_action || data.click_action || '/';

    // Log
    self.log('Event: notificationclick event', event);
    self.log('Event: notificationclick data', data);
    self.log('Event: notificationclick payload', payload);
    self.log('Event: notificationclick clickAction', clickAction);

    // Handle the click
    event.waitUntil(
      clients.openWindow(clickAction)
    );

    // Close the notification
    notification.close();
  });

  // Send messages: https://stackoverflow.com/questions/35725594/how-do-i-pass-data-like-a-user-id-to-a-web-worker-for-fetching-additional-push
  // more messaging: http://craig-russell.co.uk/2016/01/29/background-messaging.html#.XSKpRZNKiL8
  serviceWorker.addEventListener('message', (event) => {
    try {
      // Get the data
      const data = event.data || {};
      const response = {
        status: 'success',
        command: '',
        data: {}
      };

      // Parse the data
      data.command = data.command || '';
      data.args = data.args || {};
      response.command = data.command;

      // Quit if no command
      if (data.command === '') { return };

      // Log
      self.log('Event: postMessage', data);

      // Handle the command
      if (data.command === 'function') {
        data.args.function = data.args.function || function() {};
        data.args.function();
      } else if (data.command === 'debug') {
        self.log('Debug data =', data);
        event.ports[0].postMessage(response);
      } else if (data.command === 'skipWaiting') {
        self.skipWaiting();
        event.ports[0].postMessage(response);
      } else if (data.command === 'unregister') {
        self.registration.unregister()
        .then(() => {
          event.ports[0].postMessage(response);
        })
        .catch(() => {
          response.status = 'fail';
          event.ports[0].postMessage(response);
        });
      } else if (data.command === 'cache') {
        data.args.pages = data.args.pages || [];
        var defaultPages =
        [
          '/',
          '/index.html',
          /* '/?homescreen=1', */
          '/assets/css/main.css',
          '/assets/js/main.js',
        ];
        var pagesToCache = arrayUnique(data.args.pages.concat(defaultPages));
        caches.open(SWManager.cache.name).then(cache => {
          return cache.addAll(
            pagesToCache
          )
          .then(() => {
            self.log('Cached resources.');
            event.ports[0].postMessage(response);
          })
          .catch(() => {
            response.status = 'fail';
            event.ports[0].postMessage(response);
            self.log('Failed to cache resources.')
          });
        })
      }

      event.ports[0].postMessage(response);
    } catch (e) {
      // Set up a response
      response.success = 'fail';

      // Try to send a response
      try { event.ports[0].postMessage(response) } catch (e) {}

      // Log
      self.log('Failed to receive message:', data, e);
    }
  });

  // Log
  self.log('Set up listeners');
}

// Import Firebase
function importFirebase(self) {
  // Import Firebase libraries
  // importScripts(
  //   'https://www.gstatic.com/firebasejs/{ firebaseVersion }/firebase-app-compat.js',
  //   'https://www.gstatic.com/firebasejs/{ firebaseVersion }/firebase-messaging-compat.js',
  //   'https://www.gstatic.com/firebasejs/{ firebaseVersion }/firebase-database-compat.js',
  //   'https://www.gstatic.com/firebasejs/{ firebaseVersion }/firebase-firestore-compat.js',
  // );
  console.error('---0');
  console.error('---1', __dirname);
  // const firebase = require('web-manager/node_modules/firebase/firebase-app-compat.js');
  // const firebase = require('web-manager');
  // const firebase = require('firebase/firebase-auth-compat.js');
  console.error('---2', firebase);

  // Initialize app
  const app = firebase.initializeApp(self.config.firebase);

  // Initialize messaging
  self.libraries.messaging = firebase.messaging();

  // Attach firebase to SWManager
  self.libraries.firebase = firebase;
}

function setupLiveReload(self) {
  // Quit if not in dev mode
  if (self.environment !== 'development') { return };

  // Setup livereload
  const address = `ws://localhost:{ liveReloadPort }/livereload`;
  let connection;
  let isReconnecting = false; // Flag to track reconnections

  // Function to establish a connection
  function connect() {
    connection = new WebSocket(address);

    // Log connection
    self.log(`Reload connecting to ${address}...`);

    // Log connection errors
    connection.onerror = (e) => {
      self.error('Reload connection got error:', e);
    };

    // Log when set up correctly
    connection.onopen = () => {
      self.log('Reload connection set up!');

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
      self.log(`Reload connection closed. Attempting to reconnect in ${seconds} second(s)...`);

      // Set the reconnection flag
      isReconnecting = true;

      // Reconnect
      setTimeout(connect, seconds * 1000); // Retry
    };

    // Handle incoming messages
    connection.onmessage = function (event) {
      if (!event.data) {
        return;
      }

      // Get data
      const data = JSON.parse(event.data);

      // Log
      self.log('Reload connection got message:', data);

      // Handle reload command
      if (data && data.command === 'reload') {
        reload();
      }
    };
  }

  function reload() {
    self.log('Reloading extension...');
    setTimeout(() => {
      self.extension.runtime.reload();
    }, 1000);
  }

  // Start the initial connection
  connect();
}

function arrayUnique(array) {
  var a = array.concat();

  // Loop through array
  for(var i=0; i<a.length; ++i) {
    for(var j=i+1; j<a.length; ++j) {
      if(a[i] === a[j]) {
        a.splice(j--, 1);
      }
    }
  }

  // Return
  return a;
}

// Export
module.exports = Manager;
