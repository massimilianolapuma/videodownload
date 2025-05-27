// Background service worker for Video Downloader extension
class VideoDownloaderBackground {
  constructor() {
    this.activeDownloads = new Map(); // Track active downloads with progress
    this.downloadProgress = new Map(); // Store download progress data
    this.downloadControllers = new Map(); // Store download abort controllers
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        console.log("Video Downloader extension installed");
        this.setupSidePanel();
      }
    });

    // Listen for messages from content scripts or popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Listen for tab updates to clear stored videos
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "loading") {
        // Clear stored videos when page starts loading
        chrome.storage.local.remove([`videos_${tabId}`]);
      }
    });

    // Clean up storage when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      chrome.storage.local.remove([`videos_${tabId}`]);
    });

    // Listen for web requests to detect video URLs
    this.setupWebRequestListener();

    // Listen for download changes to track progress
    this.setupDownloadListener();

    // Setup side panel
    this.setupSidePanel();

    // Setup action click listener
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    // Restore active downloads on startup
    this.restoreActiveDownloads();
  }

  setupSidePanel() {
    // Configure side panel to open on action click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log("Side panel configured to open on extension icon click");
  }

  async handleActionClick(tab) {
    try {
      // Trigger video scan when side panel is opened
      await this.triggerVideoScan(tab.id);
      console.log(
        "Extension icon clicked, triggering video scan for tab:",
        tab.id
      );
    } catch (error) {
      console.error("Error handling action click:", error);
    }
  }

  async triggerVideoScan(tabId) {
    try {
      console.log(`Triggering video scan for tab ${tabId}`);

      // Content script should be automatically injected via manifest
      // Try to connect with retries for better reliability
      let response;
      let attempts = 0;
      const maxAttempts = 5;
      const retryDelay = 500; // Start with 500ms

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(
            `Attempt ${attempts}/${maxAttempts}: Pinging content script...`
          );

          // Test connection with ping
          await chrome.tabs.sendMessage(tabId, { action: "ping" });
          console.log("✅ Content script responded to ping");

          // Now request video scan
          console.log("📡 Requesting video scan from content script...");
          response = await chrome.tabs.sendMessage(tabId, {
            action: "scanVideos",
          });

          console.log("✅ Video scan completed successfully");
          break; // Success, exit retry loop
        } catch (error) {
          console.log(`❌ Attempt ${attempts} failed:`, error.message);

          if (attempts < maxAttempts) {
            const currentDelay = retryDelay * attempts; // Exponential backoff
            console.log(`⏳ Waiting ${currentDelay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
          } else {
            console.error(
              "❌ All attempts failed. Content script may not be ready."
            );
            throw new Error(
              `Failed to connect to content script after ${maxAttempts} attempts: ${error.message}`
            );
          }
        }
      }

      console.log("📊 Video scan response:", response);

      if (response?.videos) {
        // Store videos
        await chrome.storage.local.set({
          [`videos_${tabId}`]: response.videos,
        });
        console.log(
          `✅ Stored ${response.videos.length} videos for tab ${tabId}`
        );

        // Notify side panel about the videos update
        this.broadcastMessage({
          action: "videosUpdated",
          data: {
            tabId: tabId,
            videos: response.videos,
          },
        });
      } else {
        console.log("⚠️ No videos found in scan response");
        // Store empty array to clear any existing videos
        await chrome.storage.local.set({
          [`videos_${tabId}`]: [],
        });

        // Notify side panel about empty results
        this.broadcastMessage({
          action: "videosUpdated",
          data: {
            tabId: tabId,
            videos: [],
          },
        });
      }
    } catch (error) {
      console.error("❌ Error triggering video scan:", error);
      // Store empty array on error
      try {
        await chrome.storage.local.set({
          [`videos_${tabId}`]: [],
        });

        // Notify side panel about the error
        this.broadcastMessage({
          action: "videosUpdated",
          data: {
            tabId: tabId,
            videos: [],
          },
        });
      } catch (storageError) {
        console.error("Error storing empty videos array:", storageError);
      }
    }
  }

  async openSidePanel() {
    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        // Open side panel for this tab
        await chrome.sidePanel.open({ tabId });
        console.log("Side panel opened successfully for tab:", tabId);
        return true;
      } else {
        console.error("No active tab found");
        return false;
      }
    } catch (error) {
      console.error("Error opening side panel:", error);
      // Try alternative method - open without specifying tab
      try {
        await chrome.sidePanel.open({});
        console.log("Side panel opened with fallback method");
        return true;
      } catch (fallbackError) {
        console.error("Fallback side panel open failed:", fallbackError);
        return false;
      }
    }
  }

  async restoreActiveDownloads() {
    try {
      // Load persistent download state
      const result = await chrome.storage.local.get(["activeDownloads"]);
      if (result.activeDownloads) {
        for (const [downloadId, downloadData] of Object.entries(
          result.activeDownloads
        )) {
          // Check if download is still active in Chrome
          try {
            const downloadItem = await chrome.downloads.search({
              id: parseInt(downloadId),
            });
            if (
              downloadItem.length > 0 &&
              downloadItem[0].state === "in_progress"
            ) {
              this.activeDownloads.set(downloadId, downloadData);
              this.downloadProgress.set(downloadId, {
                progress:
                  (downloadItem[0].bytesReceived / downloadItem[0].totalBytes) *
                  100,
                downloaded: downloadItem[0].bytesReceived,
                total: downloadItem[0].totalBytes,
                speed: 0,
                timeRemaining: 0,
              });
            }
          } catch (error) {
            // Download is no longer active, remove from tracking
            console.log(
              "Download no longer active:",
              downloadId,
              error.message
            );
            // Clean up any stored data for this download
            chrome.storage.local.remove([`download_${downloadId}`]);
          }
        }
      }
    } catch (error) {
      console.error("Error restoring active downloads:", error);
    }
  }

  setupDownloadListener() {
    // Monitor download progress and state changes
    chrome.downloads.onChanged.addListener((delta) => {
      this.handleDownloadChange(delta);
    });

    chrome.downloads.onCreated.addListener((downloadItem) => {
      this.handleDownloadCreated(downloadItem);
    });
  }

  setupWebRequestListener() {
    // Monitor network requests for video files
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (this.isVideoUrl(details.url)) {
          this.handleVideoRequest(details);
        }
      },
      {
        urls: ["<all_urls>"],
        types: ["xmlhttprequest", "media", "object"],
      }
    );
  }

  isVideoUrl(url) {
    const videoExtensions = [
      ".mp4",
      ".webm",
      ".mkv",
      ".avi",
      ".mov",
      ".flv",
      ".m4v",
      ".3gp",
    ];
    const videoPatterns = [
      /\.mp4(\?|$)/i,
      /\.webm(\?|$)/i,
      /\.mkv(\?|$)/i,
      /\.avi(\?|$)/i,
      /\.mov(\?|$)/i,
      /\.flv(\?|$)/i,
      /\.m4v(\?|$)/i,
      /\.3gp(\?|$)/i,
      /blob:/i,
      /youtube\.com.*videoplayback/i,
      /googlevideo\.com/i,
      /vimeo\.com.*progressive/i,
      /twitch\.tv.*\.m3u8/i,
    ];

    return (
      videoPatterns.some((pattern) => pattern.test(url)) ||
      videoExtensions.some((ext) => url.toLowerCase().includes(ext))
    );
  }

  async handleVideoRequest(details) {
    try {
      // Store detected video URL for the tab
      const tabId = details.tabId;
      if (tabId && tabId !== -1) {
        const storageKey = `detected_videos_${tabId}`;
        const result = await chrome.storage.local.get([storageKey]);
        const detectedVideos = result[storageKey] || [];

        // Avoid duplicates
        if (!detectedVideos.some((v) => v.url === details.url)) {
          detectedVideos.push({
            url: details.url,
            timestamp: Date.now(),
            method: details.method,
            type: details.type,
          });

          // Keep only recent videos (last 100)
          if (detectedVideos.length > 100) {
            detectedVideos.splice(0, detectedVideos.length - 100);
          }

          await chrome.storage.local.set({ [storageKey]: detectedVideos });
        }
      }
    } catch (error) {
      console.error("Error handling video request:", error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "getDetectedVideos": {
          const videos = await this.getDetectedVideos(sender.tab.id);
          sendResponse({ videos });
          break;
        }

        case "downloadVideo": {
          const result = await this.downloadVideo(request.video);
          sendResponse(result);
          break;
        }

        case "analyzeVideo": {
          const analysis = await this.analyzeVideoUrl(request.url);
          sendResponse({ analysis });
          break;
        }

        case "getDownloadProgress": {
          const downloads = Object.fromEntries(this.downloadProgress);
          sendResponse({ downloads });
          break;
        }

        case "pauseDownload": {
          const result = await this.pauseDownload(request.downloadId);
          sendResponse({ success: result });
          break;
        }

        case "resumeDownload": {
          const result = await this.resumeDownload(request.downloadId);
          sendResponse({ success: result });
          break;
        }

        case "cancelDownload": {
          const result = await this.cancelDownload(request.downloadId);
          sendResponse({ success: result });
          break;
        }

        case "openSidePanel": {
          await this.openSidePanel();
          sendResponse({ success: true });
          break;
        }

        case "getCurrentTabId": {
          const tabId = sender.tab?.id || 0;
          sendResponse({ tabId });
          break;
        }

        case "videosDetected": {
          // Handle notification when videos are auto-detected
          console.log(
            `Auto-detected ${request.count} videos on tab ${request.tabId}`
          );
          sendResponse({ success: true });
          break;
        }

        case "triggerVideoScan": {
          await this.triggerVideoScan(request.tabId);
          sendResponse({ success: true });
          break;
        }

        case "downloadBlob": {
          console.log("Processing blob download request");

          try {
            // Convert base64 to blob
            const blob = this.base64ToBlob(request.data, request.mimeType);

            // Create a blob URL in the service worker context
            const blobUrl = URL.createObjectURL(blob);

            // Download the blob
            chrome.downloads.download(
              {
                url: blobUrl,
                filename: request.filename,
                saveAs: true,
              },
              (downloadId) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Blob download error:",
                    chrome.runtime.lastError
                  );
                  URL.revokeObjectURL(blobUrl); // Clean up on error
                  sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message,
                  });
                } else {
                  console.log("Blob download started:", downloadId);

                  // Clean up the blob URL after a delay
                  setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                  }, 60000); // Clean up after 1 minute

                  sendResponse({ success: true, downloadId });
                }
              }
            );
          } catch (error) {
            console.error("Error processing blob download:", error);
            sendResponse({ success: false, error: error.message });
          }

          return true; // Keep message channel open
        }

        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleDownloadCreated(downloadItem) {
    // Track new downloads that we initiated
    if (this.activeDownloads.has(downloadItem.id.toString())) {
      const download = this.activeDownloads.get(downloadItem.id.toString());

      // Automatically open side panel for download tracking
      this.openSidePanel().catch((err) => {
        console.log("Side panel not available or already open:", err.message);
      });

      // Notify side panel about download start
      this.broadcastMessage({
        action: "downloadStarted",
        data: {
          id: downloadItem.id.toString(),
          title: download.title,
          filename: downloadItem.filename,
          url: downloadItem.url,
          total: downloadItem.totalBytes,
          pausable: downloadItem.canResume,
          startTime: Date.now(),
        },
      });

      // Persist download state for continuity
      await this.saveDownloadState();
    }
  }

  async handleDownloadChange(delta) {
    const downloadId = delta.id.toString();

    if (!this.activeDownloads.has(downloadId)) {
      return;
    }

    try {
      // Get current download info
      const downloadItems = await chrome.downloads.search({ id: delta.id });
      if (downloadItems.length === 0) {
        return;
      }

      const downloadItem = downloadItems[0];
      const progress =
        downloadItem.totalBytes > 0
          ? (downloadItem.bytesReceived / downloadItem.totalBytes) * 100
          : 0;

      // Calculate download speed and time remaining
      const now = Date.now();
      const elapsed =
        now - (this.downloadProgress.get(downloadId)?.lastUpdate || now);
      const bytesReceived = downloadItem.bytesReceived;
      const previousBytes =
        this.downloadProgress.get(downloadId)?.downloaded || 0;

      let speed = 0;
      let timeRemaining = 0;

      if (elapsed > 0 && bytesReceived > previousBytes) {
        speed = (bytesReceived - previousBytes) / (elapsed / 1000);
        if (speed > 0 && downloadItem.totalBytes > bytesReceived) {
          timeRemaining =
            ((downloadItem.totalBytes - bytesReceived) / speed) * 1000;
        }
      }

      // Update progress data
      this.downloadProgress.set(downloadId, {
        progress: progress,
        downloaded: bytesReceived,
        total: downloadItem.totalBytes,
        speed: speed,
        timeRemaining: timeRemaining,
        lastUpdate: now,
        status: downloadItem.state,
      });

      // Broadcast update to side panel
      this.broadcastMessage({
        action: "downloadUpdate",
        data: {
          id: downloadId,
          progress: progress,
          downloaded: bytesReceived,
          total: downloadItem.totalBytes,
          speed: speed,
          timeRemaining: timeRemaining,
          status: downloadItem.state,
        },
      });

      // Handle completion or errors
      if (downloadItem.state === "complete") {
        this.handleDownloadCompleted(downloadId);
      } else if (downloadItem.state === "interrupted") {
        this.handleDownloadError(downloadId, downloadItem.error);
      }
    } catch (error) {
      console.error("Error handling download change:", error);
    }
  }

  async handleDownloadCompleted(downloadId) {
    // Move from active to completed
    this.activeDownloads.delete(downloadId);
    this.downloadProgress.delete(downloadId);

    // Save updated state
    await this.saveDownloadState();

    // Notify side panel
    this.broadcastMessage({
      action: "downloadCompleted",
      data: { id: downloadId },
    });
  }

  async handleDownloadError(downloadId, error) {
    // Update download with error status
    const progressData = this.downloadProgress.get(downloadId) || {};
    progressData.status = "error";
    progressData.error = error;
    this.downloadProgress.set(downloadId, progressData);

    // Notify side panel
    this.broadcastMessage({
      action: "downloadError",
      data: {
        id: downloadId,
        error: error || "Unknown error",
      },
    });
  }

  async pauseDownload(downloadId) {
    try {
      await chrome.downloads.pause(parseInt(downloadId));
      return true;
    } catch (error) {
      console.error("Error pausing download:", error);
      return false;
    }
  }

  async resumeDownload(downloadId) {
    try {
      await chrome.downloads.resume(parseInt(downloadId));
      return true;
    } catch (error) {
      console.error("Error resuming download:", error);
      return false;
    }
  }

  async cancelDownload(downloadId) {
    try {
      await chrome.downloads.cancel(parseInt(downloadId));

      // Clean up tracking
      this.activeDownloads.delete(downloadId);
      this.downloadProgress.delete(downloadId);

      // Save updated state
      await this.saveDownloadState();

      return true;
    } catch (error) {
      console.error("Error canceling download:", error);
      return false;
    }
  }

  async saveDownloadState() {
    try {
      await chrome.storage.local.set({
        activeDownloads: Object.fromEntries(this.activeDownloads),
      });
    } catch (error) {
      console.error("Error saving download state:", error);
    }
  }

  broadcastMessage(message) {
    // Send message to side panel and popup
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore errors if no listeners
    });
  }

  async getDetectedVideos(tabId) {
    try {
      const storageKey = `detected_videos_${tabId}`;
      const result = await chrome.storage.local.get([storageKey]);
      return result[storageKey] || [];
    } catch (error) {
      console.error("Error getting detected videos:", error);
      return [];
    }
  }

  async downloadVideo(video) {
    try {
      console.log("Background script downloading:", video.url);

      // Check if URL is accessible for download
      if (video.url.startsWith("blob:")) {
        throw new Error(
          "Blob URLs cannot be downloaded directly by background script"
        );
      }

      const filename = this.generateFilename(video);
      const downloadId = crypto.randomUUID();

      // Store download info before starting
      this.activeDownloads.set(downloadId, {
        title: video.title || "Unknown Video",
        url: video.url,
        filename: filename,
        startTime: Date.now(),
      });

      // Add some headers to improve download success
      const downloadOptions = {
        url: video.url,
        filename: filename,
        saveAs: true,
      };

      // For some video types, we might want to set conflictAction
      if (video.type === "network" || video.type === "detected") {
        downloadOptions.conflictAction = "uniquify";
      }

      const chromeDownloadId = await chrome.downloads.download(downloadOptions);

      // Update our tracking with Chrome's download ID
      const downloadData = this.activeDownloads.get(downloadId);
      this.activeDownloads.delete(downloadId);
      this.activeDownloads.set(chromeDownloadId.toString(), downloadData);

      // Initialize progress tracking
      this.downloadProgress.set(chromeDownloadId.toString(), {
        progress: 0,
        downloaded: 0,
        total: 0,
        speed: 0,
        timeRemaining: 0,
        lastUpdate: Date.now(),
        status: "downloading",
      });

      // Save state
      await this.saveDownloadState();

      // Open side panel when download starts so user can track progress
      await this.openSidePanel();

      console.log("Download started with ID:", chromeDownloadId);
      return { success: true, downloadId: chromeDownloadId };
    } catch (error) {
      console.error("Background download error:", error);

      // Provide more specific error messages
      if (error.message.includes("Download not permitted")) {
        throw new Error("Download blocked by browser policy");
      } else if (error.message.includes("Network error")) {
        throw new Error("Network error - video may be offline or protected");
      } else if (error.message.includes("Forbidden")) {
        throw new Error("Access denied - video may require authentication");
      }

      throw error;
    }
  }

  generateFilename(video) {
    let filename = video.title || "video";

    // Clean filename - remove invalid characters
    filename = filename.replace(/[<>:"/\\|?*]/g, "_");
    filename = filename.replace(/\s+/g, "_"); // Replace spaces with underscores
    filename = filename.substring(0, 100); // Limit length

    // Add timestamp to avoid conflicts
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");

    // Try to determine extension from URL or video type
    let extension = this.getVideoExtension(video.url, video.type);

    return `${filename}_${timestamp}.${extension}`;
  }

  getVideoExtension(url, videoType) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const urlExtension = path.split(".").pop().toLowerCase();

      // Check if it's a valid video extension
      const validExtensions = [
        "mp4",
        "webm",
        "mkv",
        "avi",
        "mov",
        "flv",
        "m4v",
        "3gp",
      ];
      if (validExtensions.includes(urlExtension)) {
        return urlExtension;
      }

      // Guess based on video type or URL patterns
      if (videoType === "youtube" || url.includes("youtube.com")) {
        return "mp4"; // YouTube typically serves MP4
      } else if (videoType === "vimeo" || url.includes("vimeo.com")) {
        return "mp4"; // Vimeo typically serves MP4
      } else if (url.includes(".webm") || videoType === "webm") {
        return "webm";
      } else if (url.includes(".mkv") || videoType === "mkv") {
        return "mkv";
      } else if (url.includes("blob:") || videoType === "blob") {
        return "mp4"; // Most blob videos are MP4
      }

      // Default to MP4
      return "mp4";
    } catch (error) {
      console.debug("Error determining video extension:", error);
      return "mp4"; // Default fallback
    }
  }

  async analyzeVideoUrl(url) {
    // Basic analysis - in a real implementation, you might want to
    // fetch headers to get more information about the video
    try {
      const urlObj = new URL(url);

      return {
        domain: urlObj.hostname,
        protocol: urlObj.protocol,
        isSecure: urlObj.protocol === "https:",
        estimatedType: this.guessVideoType(url),
      };
    } catch (error) {
      console.error("Error analyzing video URL:", error);
      return { error: "Invalid URL" };
    }
  }

  guessVideoType(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "YouTube";
    } else if (url.includes("vimeo.com")) {
      return "Vimeo";
    } else if (url.includes("twitch.tv")) {
      return "Twitch";
    } else if (url.includes(".mp4")) {
      return "MP4";
    } else if (url.includes(".webm")) {
      return "WebM";
    } else if (url.includes("blob:")) {
      return "Blob/Stream";
    } else {
      return "Unknown";
    }
  }

  // Function to convert base64 to blob
  base64ToBlob(base64Data, mimeType) {
    const base64Response = base64Data.split(",")[1];
    const binaryString = atob(base64Response);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
  }
}

// Initialize background service worker
const videoDownloaderBackground = new VideoDownloaderBackground();
