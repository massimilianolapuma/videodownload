# ✅ Video Download Testing Checklist

## Pre-Test Setup ✅

- [ ] Extension loaded in Chrome (`chrome://extensions/`)
- [ ] All permissions granted (especially sidePanel)
- [ ] Test server running (`python3 -m http.server 8080`)
- [ ] Test page accessible (`http://localhost:8080/test-page.html`)

## Basic Download Test 🎬

### Step 1: Navigation
- [ ] Navigate to `http://localhost:8080/test-page.html`
- [ ] Page loads successfully with sample videos visible

### Step 2: Extension Activation  
- [ ] Click Video Downloader extension icon
- [ ] Popup opens with "🔄 Scan for Videos" button
- [ ] No console errors in popup (Right-click → Inspect popup)

### Step 3: Video Detection
- [ ] Click "🔄 Scan for Videos" button
- [ ] Status shows "Scanning for videos..."
- [ ] Videos appear in list with titles and download buttons
- [ ] Expected: 3-5 test videos should be detected

### Step 4: Download Process
- [ ] Click "⬇️ Download" on any video
- [ ] Button changes to "⏳ Downloading..."
- [ ] Chrome download dialog appears OR automatic download starts
- [ ] Video file appears in Downloads folder
- [ ] File plays correctly when opened

## Side Panel Test 📊

### Step 1: Open Side Panel
- [ ] Right-click extension icon
- [ ] Select "Open side panel" from context menu
- [ ] Side panel opens with download manager interface

### Step 2: Multiple Downloads
- [ ] Start 2-3 downloads simultaneously
- [ ] All downloads appear in side panel
- [ ] Progress bars update in real-time
- [ ] Download speeds and remaining time shown

### Step 3: Download Control
- [ ] Pause a download - progress stops
- [ ] Resume the download - progress continues
- [ ] Cancel a download - download stops and disappears
- [ ] Clear completed downloads works

## Advanced Tests 🚀

### Focus/Unfocus Test
- [ ] Start a large download
- [ ] Click away from extension (unfocus)
- [ ] Wait 30 seconds
- [ ] Click extension icon again
- [ ] Download continues from where it left off

### Network Interruption Test  
- [ ] Start a download
- [ ] Disconnect internet briefly
- [ ] Reconnect internet
- [ ] Download resumes automatically

### Different Video Sources
- [ ] Test on YouTube video page
- [ ] Test on news website with videos
- [ ] Test on social media with embedded videos
- [ ] Test with direct MP4 links

## Error Handling 🛠️

### Console Monitoring
- [ ] No errors in main page console (F12)
- [ ] No errors in popup console (Right-click extension → Inspect popup)
- [ ] No errors in background script (chrome://extensions → service worker)
- [ ] No errors in side panel (Right-click side panel → Inspect)

### Expected Behaviors
- [ ] Graceful handling when no videos found
- [ ] Proper error messages for failed downloads
- [ ] Timeout handling for long operations
- [ ] Memory cleanup after downloads complete

## Performance Tests ⚡

### Large File Downloads
- [ ] Download file >100MB
- [ ] Download file >500MB  
- [ ] Monitor memory usage during download
- [ ] Verify complete file download (not truncated)

### Multiple Simultaneous Downloads
- [ ] Start 5+ downloads at once
- [ ] All progress correctly in side panel
- [ ] No UI freezing or lag
- [ ] All downloads complete successfully

## Success Criteria 🎯

### Must Pass ✅
- [ ] Videos detected on test page
- [ ] Downloads start successfully
- [ ] Side panel shows real-time progress
- [ ] Downloads continue when unfocused
- [ ] Files download completely (not truncated)

### Should Pass ⚠️
- [ ] Works on external video sites
- [ ] Handles network interruptions gracefully
- [ ] Multiple downloads work simultaneously
- [ ] Stream recording works for protected content

### Nice to Have 💡
- [ ] Fast download speeds
- [ ] Intuitive user interface
- [ ] Minimal memory usage
- [ ] Robust error recovery

## Troubleshooting Guide 🔧

### Videos Not Detected
1. Check if page has finished loading
2. Try manual refresh and rescan
3. Check console for JavaScript errors
4. Verify content script injection

### Downloads Fail
1. Check Chrome download settings
2. Verify sufficient disk space
3. Test with different video URLs
4. Check network connectivity

### Side Panel Issues
1. Verify sidePanel permission granted
2. Try closing and reopening panel
3. Check background script console
4. Restart extension if needed

---

**✅ Test Status**: Ready for comprehensive testing
**🎯 Success Target**: All "Must Pass" items working
**📊 Progress**: Track results in this checklist
