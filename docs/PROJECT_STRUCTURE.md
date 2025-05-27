# Video Downloader Chrome Extension - Project Structure

## Overview

This document describes the organized project structure for the Video Downloader Chrome Extension, which has been restructured to follow best practices for maintainability and development.

## Directory Structure

```
VideoDownloader/
├── README.md                   # Main project documentation
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker for downloads
├── content.js                 # Content script for video detection
├── inject.js                  # Injected script for deep page access
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup functionality
├── sidepanel.html             # Debug sidepanel interface
├── sidepanel.js               # Sidepanel functionality
├── popup.css                  # Popup styling
├── icons/                     # Extension icons
│   ├── video.png             # Source icon (master)
│   ├── video16.png           # 16x16 toolbar icon
│   ├── video32.png           # 32x32 menu icon
│   ├── video48.png           # 48x48 management icon
│   ├── video128.png          # 128x128 store icon
│   └── [legacy icons...]     # Old icon files (can be removed)
├── docs/                      # Documentation
│   ├── PROJECT_STRUCTURE.md  # This file
│   ├── ENHANCEMENT_SUMMARY.md # Video detection improvements
│   └── PROJECT_ORGANIZATION_COMPLETE.md # Organization completion notes
└── tests/                     # Test files and debugging tools
    ├── simple-video-test.html         # Basic video detection test
    ├── comprehensive-test.html        # Advanced video scenarios
    ├── test-extension-load.html       # Extension loading test
    ├── debug-video-detection.html     # Video detection debugger
    ├── debug-video-detection.js       # Debug helper script
    ├── test-enhanced-detection.sh     # Shell script for testing
    └── quick-debug.sh                 # Quick debugging script
```

## Core Extension Files

### manifest.json

- **Purpose**: Extension configuration and permissions
- **Key Features**: Manifest V3 compliance, proper permissions, icon references
- **Icons**: Now references the new video-themed icon set

### background.js

- **Purpose**: Service worker for handling downloads and storage
- **Responsibilities**: Download management, storage operations, message handling

### content.js

- **Purpose**: Main video detection logic
- **Features**:
  - Enhanced video URL validation (25+ patterns)
  - Multiple scan attempts for dynamic content
  - Improved source element selection
  - Comprehensive logging for debugging

### inject.js

- **Purpose**: Deep page access for video detection
- **Usage**: Injected into pages for accessing restricted content

### sidepanel.html/js

- **Purpose**: Debug interface with live testing capabilities
- **Features**: Real-time video detection testing, storage inspection, troubleshooting tools

## Icon System

The extension now uses a video-themed icon system based on `video.png`:

- **video16.png**: 16x16 - Used in toolbar and small UI elements
- **video32.png**: 32x32 - Used in context menus and medium UI
- **video48.png**: 48x48 - Used in extension management page
- **video128.png**: 128x128 - Used in Chrome Web Store and large displays

All icons are generated from the master `video.png` file to ensure consistency.

## Documentation (docs/)

### ENHANCEMENT_SUMMARY.md

Detailed summary of video detection improvements and technical enhancements.

### PROJECT_ORGANIZATION_COMPLETE.md

Notes on the completion of project organization and file restructuring.

### PROJECT_STRUCTURE.md (this file)

Complete project structure documentation.

## Testing Framework (tests/)

### Test HTML Files

- **simple-video-test.html**: Basic video element testing
- **comprehensive-test.html**: Advanced scenarios with dynamic content
- **test-extension-load.html**: Extension loading and initialization testing
- **debug-video-detection.html**: Interactive debugging interface

### Debug Tools

- **debug-video-detection.js**: Helper functions for debugging video detection
- **test-enhanced-detection.sh**: Automated testing script
- **quick-debug.sh**: Quick debugging and testing script

## Development Workflow

1. **Development**: Use the main extension files for core functionality
2. **Testing**: Use files in `tests/` directory for debugging and verification
3. **Documentation**: Update files in `docs/` directory for project documentation
4. **Icon Updates**: Modify `video.png` and regenerate other sizes as needed

## Usage Instructions

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `VideoDownloader` directory

### Testing Video Detection

1. Use the test files in `tests/` directory
2. Open the sidepanel for live debugging
3. Check browser console for detailed logs
4. Use the debug tools for troubleshooting

### Icon Updates

To update icons, modify `video.png` and run:

```bash
cd icons/
magick video.png -resize 16x16 video16.png
magick video.png -resize 32x32 video32.png
magick video.png -resize 48x48 video48.png
magick video.png -resize 128x128 video128.png
```

## Maintenance Notes

- Keep test files in `tests/` directory for organized development
- Update documentation in `docs/` when making significant changes
- Use the enhanced logging system for debugging video detection issues
- The sidepanel provides real-time testing capabilities for development

## Security Considerations

- All files follow Chrome extension security best practices
- Manifest V3 compliance ensures future compatibility
- Proper permission handling and content script isolation
- Input validation and error handling throughout the codebase
