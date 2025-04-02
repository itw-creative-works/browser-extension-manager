// Libraries

// Class
function Manager() {
  const self = this;

  // Properties
  self.affiliatizer = null;
  self.extension = null;

  // Return
  return self;
}

// Initialize
Manager.prototype.initialize = function () {
  const self = this;

  return new Promise(function(resolve, reject) {
    // Properties
    self.affiliatizer = require('./lib/affiliatizer').initialize(self);
    self.extension = require('./lib/extension');

    // Log
    self.log('Initialized!', self);

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
    const args = [`[${time}] content:`, ...Array.from(arguments)];

    // Call the original console method
    console[method].apply(console, args);
  };
});

// Export
module.exports = Manager;
