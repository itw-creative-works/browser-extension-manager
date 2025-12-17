# Build Instructions

This document provides instructions for building the extension from source code.

## System Requirements

This extension was built on the following system:
- **Operating System:** { system.platform } { system.release } ({ system.arch })
- **Node.js Version:** { system.nodeVersion }

## Prerequisites

1. Install Node.js { system.nodeVersion } or compatible version
2. Install npm (comes with Node.js)

## Build Steps

1. Extract the source code zip
2. Open a terminal and navigate to the extracted directory
3. Install dependencies:
```sh
npm install
```
4. Build the extension:
```sh
npm run build
```
5. The built extension will be in `packaged/raw/` directory
6. The packaged zip will be at `packaged/extension.zip`

## Loading the Extension

### Firefox
1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `packaged/raw/manifest.json`

### Chrome
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packaged/raw/` directory

## Questions

If you have any questions about the build process, please contact the developer.
