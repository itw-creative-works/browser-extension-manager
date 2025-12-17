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
5. The built extensions will be in `packaged/` directory:
   - **Chrome/Edge/Brave:** `packaged/chromium/raw/` (unpacked) and `packaged/chromium/extension.zip`
   - **Firefox:** `packaged/firefox/raw/` (unpacked) and `packaged/firefox/extension.zip`
   - **Opera:** `packaged/opera/raw/` (unpacked) and `packaged/opera/extension.zip`

## Loading the Extension

### Chrome
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packaged/chromium/raw/` directory

### Edge
1. Go to `edge://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packaged/chromium/raw/` directory

### Firefox
1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `packaged/firefox/raw/manifest.json`

### Opera
1. Go to `opera://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packaged/opera/raw/` directory

### Brave
1. Go to `brave://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packaged/chromium/raw/` directory

> **Note:** Brave is Chromium-based and uses the same build as Chrome/Edge. Extensions published to the Chrome Web Store are automatically available in Brave.

## Questions

If you have any questions about the build process, please contact the developer.
