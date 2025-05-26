<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Video Downloader Chrome Extension - Copilot Instructions

This is a Chrome extension project for downloading videos from web pages, similar to Video DownloadHelper.

## Project Overview

- **Type**: Chrome Extension (Manifest V3)
- **Purpose**: Video detection and downloading from web pages
- **Architecture**: Service worker + Content scripts + Popup UI

## Key Technologies

- **Manifest V3**: Latest Chrome extension format
- **Service Worker**: Background processing
- **Content Scripts**: Page analysis and video detection
- **Chrome Extensions API**: Downloads, storage, webRequest, activeTab

## Code Style Guidelines

- Use modern JavaScript (ES6+) with classes
- Follow Chrome extension best practices
- Use async/await for asynchronous operations
- Implement proper error handling
- Add comprehensive logging for debugging

## Security Considerations

- Only use necessary permissions
- Validate all user inputs
- Sanitize video titles for file names
- Follow Chrome's security guidelines for extensions

## Video Detection Strategy

1. **HTML5 Videos**: Direct `<video>` element analysis
2. **Embedded Videos**: YouTube, Vimeo iframe detection
3. **Network Monitoring**: webRequest API for video URLs
4. **Script Analysis**: Parse JavaScript for video sources
5. **Dynamic Content**: Mutation observers for SPAs

## File Structure

- `manifest.json`: Extension configuration
- `background.js`: Service worker for downloads and storage
- `content.js`: Content script for video detection
- `inject.js`: Injected script for deep page access
- `popup.html/js`: User interface
- `icons/`: Extension icons

## Common Patterns

- Use Chrome storage API for temporary data
- Implement message passing between scripts
- Handle both static and dynamic content
- Provide user feedback for all operations
- Support various video formats and sources

## Testing Considerations

- Test on various websites with different video implementations
- Verify manifest V3 compliance
- Test download functionality across different file types
- Ensure proper cleanup of temporary data
- Test permission handling
