// Libraries
const WebManager = require('web-manager');

// Class
function Manager() {
  const self = this;

  // Return
  return self;
}

// Initialize
Manager.prototype.initialize = function (callback) {
  const self = this;

  // Initiate the web manager
  self._manager = new WebManager();

  // Initialize
  self._manager.init(window.Configuration, callback);

  // Return
  return self._manager;
};

// Export
module.exports = Manager;
