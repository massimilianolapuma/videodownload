# Tests & Utilities

This folder contains all test files, validation scripts, and utility tools for the Video Downloader Chrome Extension.

## 🧪 Test Scripts

### Extension Testing

- [`test-extension.sh`](test-extension.sh) - Main extension validation script
- [`test-four-issues.sh`](test-four-issues.sh) - Tests for the four major resolved issues
- [`test-fixes.js`](test-fixes.js) - JavaScript fix validation tests

### Validation Scripts

- [`validate-fixes.js`](validate-fixes.js) - Validates recent bug fixes
- [`quick-validate.sh`](quick-validate.sh) - Quick validation script
- [`health-check.js`](health-check.js) - Extension health check

## 🎬 Test Pages

### HTML Test Files

- [`fix-validation-test.html`](fix-validation-test.html) - Validation page for critical fixes
- [`debug-test.html`](debug-test.html) - Debug testing page with sample videos
- [`debug-comprehensive.html`](debug-comprehensive.html) - Comprehensive debug page
- [`quick-test.html`](quick-test.html) - Quick testing page
- [`test-page.html`](test-page.html) - General test page

## 🔧 Debug Tools

### Debug Scripts

- [`debug-extension.sh`](debug-extension.sh) - Extension debugging script
- [`debug-sidepanel.js`](debug-sidepanel.js) - Side panel debugging utilities

## 🛠️ Utility Scripts

### Setup & Packaging

- [`setup.sh`](setup.sh) - Extension setup script
- [`package-extension.sh`](package-extension.sh) - Package extension for distribution

## Usage

### Running Tests

```bash
# Run main extension test
./test-extension.sh

# Quick validation
./quick-validate.sh

# Health check
node health-check.js

# Test specific fixes
node test-fixes.js
```

### Using Test Pages

1. Open any of the HTML test files in Chrome
2. Load the Video Downloader extension
3. Test video detection and download functionality
4. Use browser developer tools for debugging

### Debug Mode

The debug tools provide detailed logging and inspection capabilities:

- Use `debug-test.html` for step-by-step testing
- Run `debug-extension.sh` for automated debugging
- Check `debug-sidepanel.js` for side panel specific issues

## File Organization

All test and utility files have been organized into this `tests/` folder for better project structure. The main extension files remain in the root directory, while documentation is located in the `docs/` folder.
