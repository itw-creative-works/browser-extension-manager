// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('themes');
const { src, dest, watch, series } = require('gulp');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');
