# 🎬 Quick Video Download Guide

## How to Download Videos (Step-by-Step)

### 1. **Test Your Extension First**
- Navigate to: `http://localhost:8080/test-page.html`
- This page has sample videos for testing

### 2. **Open the Extension**
- Click the Video Downloader icon in Chrome toolbar
- You should see the popup with "🔄 Scan for Videos" button

### 3. **Scan for Videos**
- Click **"🔄 Scan for Videos"** button
- Wait for the extension to detect videos on the page
- You should see a list of found videos appear

### 4. **Download Videos**
- Each detected video will show:
  - Video title
  - Quality/size info
  - **"⬇️ Download"** button
- Click the download button for any video you want

### 5. **Monitor Downloads**
- **Popup**: Shows immediate download status
- **Side Panel**: Open by right-clicking extension icon → "Open side panel"
  - View all active downloads
  - Monitor progress in real-time
  - Pause/resume/cancel downloads

## 🔧 Troubleshooting

### If No Videos Are Found:
1. **Refresh the page** and try scanning again
2. **Check the console** (F12) for any errors
3. **Try a different website** with known video content
4. **Verify extension permissions** are granted

### If Downloads Fail:
1. **Check Chrome's download settings** (chrome://downloads/)
2. **Try the alternative download method** (extension will attempt automatically)
3. **Use "Download from Video Stream"** for protected content
4. **Check the side panel** for download status

### Common Video Sources That Work:
- ✅ HTML5 `<video>` elements with direct URLs
- ✅ MP4, WebM, OGV files
- ✅ News website embedded videos
- ✅ Social media videos (some)
- ⚠️ YouTube/protected streams (may require stream recording)

## 🎯 Quick Test

1. Go to `http://localhost:8080/test-page.html`
2. Click extension icon
3. Click "🔄 Scan for Videos"
4. You should see several test videos listed
5. Click "⬇️ Download" on any video
6. Check Downloads folder or side panel

## 🚀 Advanced Features

### Stream Recording
For protected videos (like YouTube), the extension can record the video stream:
1. Play the video on the page
2. Use "Download from Video Stream" option (if available)
3. The extension will record the playing video
4. Monitor progress in side panel

### Download Management
- **Side Panel**: Full download manager
- **Real-time Progress**: See download speed, remaining time
- **Multiple Downloads**: Handle several downloads simultaneously
- **Download History**: View completed downloads

**Happy Downloading! 🎉**
