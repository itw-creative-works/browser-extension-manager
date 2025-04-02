// Libraries
// import ext from './ext';
const ext = require('./extension.js');

// Messaging
function Messaging(init) {
  const self = this;

  // Check init
  if (!init || !init) {
    throw new Error('No init and/or init.sender')
  }

  // Setup
  self.onMessage = function () {}
  self.sender = init.sender;
  ext.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      self.onMessage(request, sender, sendResponse)
    }
  );
}

// Send
Messaging.prototype.send = function (request) {
  const self = this;

  // Check request
  if (!request) {
    throw new Error('No request')
  } else if (!request.destination) {
    throw new Error('No request.destination')
  }

  // Check sender
  ext.runtime.sendMessage({
    sender: self.sender,
    destination: request.destination,
    command: request.command,
    payload: request.payload,
  })
  .catch(e => {
    console.warn(`Failed to send message ${self.sender} => ${request.destination}`, request.command, request.payload);
  })
};

// Export
module.exports = Messaging;
