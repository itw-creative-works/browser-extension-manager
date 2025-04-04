// Libraries
const WebManager = require('web-manager');

// Class
function Manager() {
  const self = this;

  // Return
  return self;
}

Manager.prototype.initialize = function (callback) {
  const self = this;

  // Configuration
  const configuration = JSON.parse('%%% webManagerConfiguration %%%');

  // Initiate the web manager
  self.manager = new WebManager();
  self.extension = require('./lib/extension');

  // Initialize
  self.manager.init(configuration, callback);

  // Return
  return self.manager;
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
    const args = [`[${time}] content:`, ...Array.from(arguments)];

    // Call the original console method
    console[method].apply(console, args);
  };
});

// Export
module.exports = Manager;
