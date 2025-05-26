# Video Downloader Chrome Extension

A Chrome extension for downloading videos from web pages, similar to Video DownloadHelper.

## Features

- 🎥 **Video Detection**: Automatically detects video files on web pages
- 📥 **Easy Downloads**: One-click download functionality
- 🔍 **Multiple Sources**: Supports HTML5 videos, embedded videos, and network-detected streams
- 🎯 **Smart Scanning**: Detects videos from various sources including:
  - HTML5 `<video>` elements
  - YouTube and Vimeo embeds
  - Video URLs in scripts and data attributes
  - Network requests for video files
- 🎨 **Modern UI**: Clean and intuitive popup interface
- ⚡ **Performance**: Lightweight background service worker

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Video Downloader extension should now appear in your extensions

### Using the Extension

1. Navigate to any webpage with videos
2. Click the Video Downloader extension icon in the toolbar
3. Click "🔄 Scan for Videos" to detect videos on the page
4. Click "⬇️ Download" next to any video you want to save
5. Choose where to save the video file

## Supported Video Sources

- **Direct video files**: .mp4, .webm, .mkv, .avi, .mov, .flv, .m4v, .3gp
- **Streaming videos**: Blob URLs and media streams
- **Embedded videos**: YouTube, Vimeo (links only - requires separate downloader)
- **Dynamic content**: Videos loaded via JavaScript

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Service Worker**: Background script for handling downloads and storage
- **Content Script**: Analyzes webpage content for video sources
- **Popup Interface**: User-friendly interface for managing downloads

### Permissions

- `activeTab`: Access to the current tab for video detection
- `downloads`: Download videos to user's computer
- `storage`: Store detected videos temporarily
- `webRequest`: Monitor network requests for video files
- `<all_urls>`: Access to all websites for video detection

## Development

### Project Structure

```
VideoDownloader/
├── manifest.json          # Extension manifest
├── popup.html             # Popup interface
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for page analysis
├── inject.js              # Injected script for deep page access
├── icons/                 # Extension icons
│   └── icon.svg          # SVG icon source
└── README.md             # This file
```

### Building Icons

The extension includes an SVG icon that needs to be converted to PNG format for different sizes. You can use online converters or tools like ImageMagick:

```bash
# Example with ImageMagick (if installed)
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 32x32 icons/icon32.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

### Debugging

1. Right-click the extension icon and select "Inspect popup" to debug the popup
2. Go to `chrome://extensions/` and click "Inspect views: service worker" to debug the background script
3. Use browser developer tools to debug content scripts

## Limitations

- YouTube and Vimeo videos show as links only (due to platform restrictions)
- Some streaming services use DRM protection that prevents direct downloading
- Dynamic content may require manual rescanning
- Large video files may take time to download

## Privacy

This extension:
- Does not collect or transmit any personal data
- Only analyzes the current webpage when explicitly requested
- Stores video information locally and temporarily
- Does not send any data to external servers

## License

This project is for educational purposes. Please respect copyright laws and website terms of service when downloading videos.

## Contributing

Feel free to submit issues and enhancement requests!

## Troubleshooting

### Videos Not Detected
- Try clicking "Scan for Videos" button
- Refresh the page and try again
- Some videos may load dynamically - wait for them to start playing

### Download Fails
- Check if the video URL is still valid
- Some websites may block direct downloads
- Try right-clicking the video and using "Save video as..." as an alternative

### Extension Not Working
- Make sure Developer Mode is enabled in Chrome extensions
- Check the browser console for error messages
- Try reloading the extension
