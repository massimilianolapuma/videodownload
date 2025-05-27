# 🔧 Video Downloader Extension - Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Issue 1: Extension Won't Load
**Symptoms**: Error when loading unpacked extension
**Solutions**:
```bash
1. Check Chrome version (requires Chrome 88+)
2. Verify all files are present in the directory
3. Check manifest.json syntax with: cat manifest.json | jq .
4. Reload extension: chrome://extensions/ → reload button
```

### Issue 2: Side Panel Not Opening
**Symptoms**: Clicking "Open Side Panel" does nothing
**Solutions**:
```bash
1. Check Chrome version supports side panels (Chrome 114+)
2. Verify sidePanel permission in manifest.json
3. Try closing and reopening Chrome
4. Check browser console for errors (F12)
```

### Issue 3: No Videos Detected
**Symptoms**: Side panel shows "No videos found"
**Solutions**:
```bash
1. Click "Rescan Videos" button
2. Wait for page to fully load before scanning
3. Check if page actually has video content
4. Try on test page: quick-test.html
5. Check content script injection: F12 → Console → look for injection logs
```

### Issue 4: Videos Detected But Not Showing
**Symptoms**: Console shows videos found but side panel empty
**Solutions**:
```bash
1. Check sidepanel.js console for message reception
2. Verify storage permissions in manifest.json
3. Clear extension storage: chrome://extensions/ → Details → Clear storage
4. Reload extension and try again
```

### Issue 5: Downloads Not Starting
**Symptoms**: Click download but nothing happens
**Solutions**:
```bash
1. Check downloads permission in manifest.json
2. Verify Chrome download settings allow downloads
3. Check background script console for errors
4. Try with a different video URL
```

---

## 🔍 Debug Steps

### Step 1: Check Extension Status
```bash
1. Go to chrome://extensions/
2. Verify extension is enabled
3. Check for any error messages
4. Note the extension ID
```

### Step 2: Check Background Script
```bash
1. chrome://extensions/ → Details → Inspect service worker
2. Look for initialization logs
3. Check for any red error messages
4. Verify message listeners are set up
```

### Step 3: Check Content Script
```bash
1. Open target webpage
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for content script injection messages
5. Check for video detection logs
```

### Step 4: Check Side Panel
```bash
1. Open side panel
2. Right-click → Inspect
3. Check Console for message reception
4. Verify DOM elements are populated
5. Check Network tab for any failed requests
```

---

## 📊 Debug Commands

### In Background Script Console:
```javascript
// Check video storage
chrome.storage.local.get(null, console.log);

// Trigger manual scan
triggerVideoScan();

// Check active downloads
console.log(activeDownloads);
```

### In Content Script Console:
```javascript
// Manual video scan
console.log(document.querySelectorAll('video'));

// Check for injected script
console.log('Content script loaded:', typeof scanForVideos);
```

### In Side Panel Console:
```javascript
// Check current state
console.log('Current tab:', this.currentTabId);
console.log('Videos loaded:', document.querySelectorAll('.video-item').length);

// Trigger manual update
this.loadVideos();
```

---

## 🔄 Reset Extension

If all else fails, complete reset:
```bash
1. chrome://extensions/ → Remove extension
2. Close all Chrome windows
3. Restart Chrome
4. Load extension again
5. Test on fresh tab
```

---

## 📞 Getting Help

### Log Collection
When reporting issues, include:
1. Chrome version: `chrome://version/`
2. Extension logs from background script console
3. Content script console logs from target page
4. Side panel console logs
5. Steps to reproduce the issue

### Debug Information
```javascript
// Run this in background script console for debug info
console.log({
  manifest: chrome.runtime.getManifest(),
  permissions: chrome.runtime.getManifest().permissions,
  version: chrome.runtime.getManifest().version
});
```

The extension has comprehensive logging built-in, so most issues can be diagnosed through the console logs! 🔍
