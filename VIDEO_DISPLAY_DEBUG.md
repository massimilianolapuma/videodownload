# 🔧 Video Display Debug Guide

## 🚨 Current Issue: Videos Detected But Not Displayed

Based on your debug info:

- ✅ **Storage**: 6 videos found in storage
- ✅ **Detection**: Videos are being detected correctly
- ❌ **Display**: Videos not appearing in sidepanel UI

## 🔍 Enhanced Debug Steps

### Step 1: Open Sidepanel DevTools

1. Open the sidepanel (if not already open)
2. Right-click in the sidepanel → "Inspect"
3. This opens DevTools for the sidepanel specifically

### Step 2: Run Enhanced Debug Commands

In the **sidepanel console**, run these commands:

```javascript
// 1. Check if videos are in the component
console.log("Videos in component:", window.videoDownloaderSidePanel.videos);

// 2. Check DOM elements exist
console.log("videoList element:", document.getElementById("videoList"));
console.log("emptyState element:", document.getElementById("emptyState"));

// 3. Force reload videos with enhanced debugging
window.videoDownloaderSidePanel.forceReloadVideos();

// 4. Manual storage check
window.debugCheckStorage();

// 5. Force manual render (if videos exist but not displaying)
if (window.videoDownloaderSidePanel.videos.length > 0) {
  console.log("Attempting manual render...");
  window.videoDownloaderSidePanel.renderVideos();
}
```

### Step 3: Check for JavaScript Errors

Look for any red error messages in the console that might indicate:

- Template string errors
- DOM manipulation failures
- Event binding issues
- Missing properties on video objects

### Step 4: Verify DOM State

```javascript
// Check if video items are actually being created
const videoList = document.getElementById("videoList");
console.log("VideoList innerHTML:", videoList.innerHTML);
console.log("VideoList children:", videoList.children.length);
console.log("Video items:", document.querySelectorAll(".video-item").length);
```

## 🛠 Potential Fixes

### Fix 1: Manual Video Loading

If videos are in storage but not displaying:

```javascript
// In sidepanel console
chrome.storage.local.get(null).then((storage) => {
  const tabId = window.videoDownloaderSidePanel.currentTabId;
  const videos = storage[`videos_${tabId}`];
  console.log("Manual load:", videos);

  if (videos && videos.length > 0) {
    window.videoDownloaderSidePanel.videos = videos;
    window.videoDownloaderSidePanel.renderVideos();
  }
});
```

### Fix 2: DOM Reset

If the DOM seems corrupted:

```javascript
// Clear and reset the video list
const videoList = document.getElementById("videoList");
videoList.innerHTML = "";
videoList.style.display = "flex";
videoList.style.flexDirection = "column";
videoList.style.gap = "16px";

// Force re-render
window.videoDownloaderSidePanel.renderVideos();
```

### Fix 3: CSS Display Issues

Check if videos are rendered but hidden:

```javascript
// Force show all video items
document.querySelectorAll(".video-item").forEach((item) => {
  item.style.display = "block";
  item.style.visibility = "visible";
  item.style.opacity = "1";
});

// Check computed styles
const videoList = document.getElementById("videoList");
console.log("VideoList computed style:", window.getComputedStyle(videoList));
```

## 📊 Expected Console Output

After running the debug commands, you should see:

```
🔄 Force reloading videos...
🔄 Current tab ID: [your-tab-id]
📂 Loading videos for tab [tab-id]
📹 Found 6 videos in storage: [video-array]
🎯 this.videos set to array of length: 6
🎬 About to call renderVideos with videos: 6
🎬 Starting renderVideos with 6 videos
📹 Rendering videos...
Creating video item 1: [video-object]
✅ Video item 1 created and appended successfully
... (repeat for all 6 videos)
✅ renderVideos completed. Expected: 6, Rendered: 6
```

## 🚨 If Videos Still Don't Display

### Last Resort: Complete Reset

```javascript
// 1. Clear everything
window.videoDownloaderSidePanel.videos = [];
document.getElementById("videoList").innerHTML = "";

// 2. Trigger fresh scan
chrome.runtime.sendMessage({
  action: "triggerVideoScan",
  tabId: window.videoDownloaderSidePanel.currentTabId,
});

// 3. Wait a few seconds, then check storage again
setTimeout(() => {
  window.debugCheckStorage();
}, 3000);
```

### Check Extension State

```javascript
// Verify extension is properly loaded
console.log("Extension manifest:", chrome.runtime.getManifest());
console.log("Current URL:", window.location.href);
console.log("SidePanel object:", window.videoDownloaderSidePanel);
```

## 📞 Report Results

After running these debug steps, please report:

1. **Console Output**: Copy any error messages or logs
2. **DOM State**: Results of DOM element checks
3. **Video Data**: Sample of what the video objects look like
4. **Success/Failure**: Whether any of the manual fixes worked

This enhanced debugging will help us identify exactly where the display pipeline is breaking! 🔍
