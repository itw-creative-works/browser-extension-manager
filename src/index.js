// Libraries
const WebManager = require('web-manager');

// Class
function Manager() {
  const self = this;

  // Properties
  self.webManager = null;
  self.extension = null;
  self.logger = null;

  // Return
  return self;
}

Manager.prototype.initialize = function (callback) {
  const self = this;

  // Configuration
  const configuration = JSON.parse('%%% webManagerConfiguration %%%');

  // Initiate the web manager
  self.webManager = new WebManager();
  self.extension = require('./lib/extension');
  self.logger = new (require('./lib/logger-lite'))('popup');

  // Initialize
  self.webManager.init(configuration, callback);

  // Return
  return self.webManager;
};

// Export
module.exports = Manager;
