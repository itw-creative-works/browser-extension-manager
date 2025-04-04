// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('serve');
const path = require('path');
const WebSocket = require('ws');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Task
module.exports = function serve(complete) {
  // Log
  logger.log('Starting...');

  // Get the local URL
  const server = new WebSocket.Server({ port: Manager.getLiveReloadPort() })

  // Log
  logger.log(`LiveReload server started on port ${Manager.getLiveReloadPort()}`);

  // Log connection
  server.on('connection', (socket, request) => {
    logger.log(`LiveReload client connected from local IP: ${request.socket.localAddress}`);
  });

  // Set server
  global.websocket = server;

  // Complete
  return complete();
};
