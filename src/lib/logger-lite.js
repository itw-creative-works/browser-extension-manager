// Libraries

// Logger class
function Logger(name) {
  const self = this;

  // Properties
  self.name = name;
}

// Loop through log, error, warn, and info and make methods that log to console with the name and time [xx:xx:xx] name: message
// Setup logger
['log', 'error', 'warn', 'info', 'debug'].forEach(method => {
  Logger.prototype[method] = function () {
    const self = this;

    // Get arguments
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Add prefix
    const args = [`[${time}] ${self.name}:`, ...Array.from(arguments)];

    // Call the original console method
    console[method].apply(console, args);
  };
});

// Export
module.exports = Logger;
