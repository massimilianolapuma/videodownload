# How to Install the Video Downloader Extension in Chrome

Follow these steps to load the extension in Chrome for testing:

## Step 1: Enable Developer Mode

1. Open Google Chrome
2. Navigate to `chrome://extensions/` in the address bar
3. Toggle "Developer mode" ON (top-right corner)

## Step 2: Load the Extension

1. Click "Load unpacked" button (top-left area)
2. Navigate to the project folder: `/Users/massilp/Projects/VideoDownloader`
3. Select the folder and click "Select Folder"

## Step 3: Verify Installation

- The extension should appear in your extensions list
- You'll see the Video Downloader icon in the Chrome toolbar
- The extension should show as "Active"

## How to Use

1. Navigate to any webpage with videos
2. Click the Video Downloader extension icon in the toolbar
3. Click "Scan for Videos" to detect videos on the page
4. Click the download button next to any video you want to download

### Testing the Extension

A comprehensive test page is included: `test-page.html`

To test the extension:
1. Open `test-page.html` in Chrome (double-click the file)
2. Use the extension to scan for videos on the test page
3. Try downloading different types of videos:
   - Regular HTML5 videos (should use direct download)
   - Blob videos (should use stream recording - **now records full length!**)
   - Embedded videos (YouTube/Vimeo detection)

The test page includes:
- ✅ Short and long video samples
- ✅ Blob URL generation for testing protected content
- ✅ Embedded video examples
- ✅ Progress monitoring examples

## Features

- **HTML5 Video Detection**: Finds `<video>` elements
- **Blob URL Handling**: Special handling for protected blob URLs
- **Network Monitoring**: Detects video streams in network requests
- **Multiple Download Methods**: Various fallback methods for protected content
- **Modern UI**: Clean, responsive popup interface

## Troubleshooting

### No Videos Found
- Try clicking "Scan for Videos" button
- Some videos load dynamically - wait for the page to fully load
- Protected videos may require alternative download methods

### Download Fails
- The extension will try multiple download methods automatically
- Some heavily protected content may not be downloadable
- Check browser's Downloads page for completed downloads

### Extension Not Working
- Make sure Developer mode is enabled
- Try reloading the extension in `chrome://extensions/`
- Check the browser console for error messages

## Development

To make changes to the extension:

1. Edit the source files in the project directory
2. Save your changes
3. Go to `chrome://extensions/`
4. Click the refresh button on the Video Downloader extension
5. Test your changes

## Permissions

The extension requires these permissions:
- `activeTab`: Access current tab to scan for videos
- `downloads`: Initiate downloads
- `storage`: Store detected videos temporarily
- `webRequest`: Monitor network requests for video detection

## Supported Video Types

- MP4, WebM, MKV, AVI, MOV, FLV
- Blob URLs (with special handling)
- YouTube and Vimeo embedded videos
- Network-detected video streams

## Note

This extension is for educational and personal use. Please respect copyright laws and website terms of service when downloading videos.
