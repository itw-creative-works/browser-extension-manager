// Libraries
const WebManager = require('web-manager');

// Class
function Manager() {
  const self = this;

  // Properties
  self.extension = null;
  self.messenger = null;
  self.logger = null;
  self.webManager = null;

  // Return
  return self;
}

Manager.prototype.initialize = function (callback) {
  const self = this;

  // Configuration
  const configuration = JSON.parse('%%% webManagerConfiguration %%%');

  // Initiate the web manager
  self.extension = require('./lib/extension');
  self.messenger = null;
  self.logger = new (require('./lib/logger-lite'))('popup');
  self.webManager = new WebManager();

  // Initialize
  self.webManager.init(configuration, callback);

  // Return
  return self.webManager;
};

// Export
module.exports = Manager;
