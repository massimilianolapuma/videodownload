# Video Downloader Extension - Installation Guide

## Quick Setup for Chrome

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select this folder: `/Users/massilp/Projects/VideoDownloader`
   - The extension should now appear in your extensions list

4. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Video Downloader" and click the pin icon

## How to Use

1. **Navigate to any webpage with videos**
2. **Click the Video Downloader extension icon**
3. **Click "🔄 Scan for Videos"** to detect videos
4. **Click "⬇️ Download"** next to any video you want to save

## Troubleshooting

### Extension Not Loading
- Make sure you selected the correct folder containing `manifest.json`
- Check that Developer Mode is enabled
- Look for error messages in the Extensions page

### No Videos Found
- Try refreshing the page and scanning again
- Some videos load dynamically - wait for them to start playing
- Check browser console for any error messages

### Downloads Not Working
- Make sure Chrome has permission to download files
- Check your download settings in Chrome
- Some websites may block direct video downloads

## Supported Sites

The extension works on most websites that use:
- HTML5 video players
- Direct video file links
- Embedded video content
- Stream-based video content

Note: Some platforms like YouTube and Netflix use DRM protection that prevents direct downloading.

## Development

To modify the extension:
1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Video Downloader extension
4. Test your changes

## Icon Conversion (Optional)

For better Chrome compatibility, you may want to convert the SVG icons to PNG:

```bash
# If you have ImageMagick installed:
convert icons/icon16.svg icons/icon16.png
convert icons/icon32.svg icons/icon32.png  
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png

# Then update manifest.json to use .png files instead of .svg
```
