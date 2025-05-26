# Video Downloader Extension - Debug Guide

## Current Issue Analysis

Based on the conversation summary, the main issues are:
1. **Videos not appearing in side panel** - even after rescan
2. **Scanning indicator stuck** - doesn't complete properly
3. **Content script communication** - potential message passing issues
4. **Tab ID consistency** - mismatches in storage keys

## Debug Workflow

### Phase 1: Basic Extension Loading
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this directory
4. Verify the extension appears and is enabled

### Phase 2: Content Script Injection Testing
1. Navigate to the debug test page: `file:///Users/massilp/Projects/VideoDownloader/debug-test.html`
2. Open Developer Tools (F12)
3. Click the extension icon
4. Check console for:
   - "Starting video scan..."
   - "Found X video elements in DOM"
   - "Processing video element..."
   - Content script initialization messages

### Phase 3: Background Script Testing
1. Go to `chrome://extensions/`
2. Click "service worker" link under the Video Downloader extension
3. This opens the background script console
4. Look for:
   - "Triggering video scan for tab X"
   - "Content script injected successfully" 
   - "Video scan response: {...}"
   - Storage operations

### Phase 4: Side Panel Testing
1. Click the extension icon to open side panel
2. Click the "Debug" button
3. Check the debug alert for:
   - Current tab ID
   - Videos in memory count
   - Storage keys count
   - Total storage items

### Phase 5: Storage Inspection
1. In background script console, run:
```javascript
chrome.storage.local.get(null).then(console.log)
```
2. Look for keys like `videos_[tabId]` and `detected_videos_[tabId]`

## Expected Behavior

### Working Video Detection:
- Debug page should detect 4 videos (2 HTML5 + 2 embeds)
- Console should show detailed scanning logs
- Side panel should display found videos
- Storage should contain videos under correct tab ID

### Potential Issues to Look For:

1. **Content Script Not Injected**
   - Error: "Could not establish connection"
   - Fix: Check manifest permissions

2. **Tab ID Mismatch**
   - Videos stored under wrong tab ID
   - Side panel looking for videos under different tab ID

3. **Message Passing Failure**
   - Background script not receiving scan response
   - Content script not responding to scanVideos message

4. **Permission Issues**
   - "scripting" permission missing from manifest
   - File:// protocol restrictions

## Debug Commands

### In Background Script Console:
```javascript
// Check active tabs
chrome.tabs.query({active: true, currentWindow: true}).then(console.log)

// Check storage
chrome.storage.local.get(null).then(console.log)

// Manually trigger scan
chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
  chrome.tabs.sendMessage(tabs[0].id, {action: "scanVideos"}).then(console.log)
})
```

### In Page Console:
```javascript
// Check if content script loaded
typeof window.videoDownloaderContent

// Check video elements
document.querySelectorAll('video').length
document.querySelectorAll('iframe').length

// Manual scan trigger
if (window.videoDownloaderContent) {
  window.videoDownloaderContent.scanForVideos().then(console.log)
}
```

## Fixes Applied

1. ✅ Added "scripting" permission to manifest.json
2. ✅ Enhanced triggerVideoScan with better error handling
3. ✅ Added debug logging to content script
4. ✅ Added debug button to side panel
5. ✅ Improved side panel video loading with detailed logs

## Test Results Expected

After loading the extension and following the debug workflow:
- [ ] Extension loads without errors
- [ ] Content script injects successfully 
- [ ] Video scanning produces console output
- [ ] Videos appear in side panel
- [ ] Storage contains video data under correct keys
- [ ] Scanning indicator completes properly

## Next Steps if Issues Persist

1. Check Chrome version compatibility (Manifest V3 requires Chrome 88+)
2. Verify file:// protocol permissions
3. Test on actual websites with videos instead of local file
4. Check for content security policy restrictions
