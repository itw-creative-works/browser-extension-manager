// Libraries

// Class
function Manager() {
  const self = this;

  // Properties
  self.extension = null;
  self.logger = null;
  self.affiliatizer = null;

  // Return
  return self;
}

// Initialize
Manager.prototype.initialize = function () {
  const self = this;

  return new Promise(function(resolve, reject) {
    // Properties
    self.extension = require('./lib/extension');
    self.logger = new (require('./lib/logger-lite'))('content');
    self.affiliatizer = require('./lib/affiliatizer').initialize(self);

    // Log
    self.logger.log('Initialized!', self);

    // Return
    return resolve(self);
  });
};

// Export
module.exports = Manager;
