// Popup script for Video Downloader extension
class VideoDownloaderPopup {
  constructor() {
    this.videos = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.autoScanAndLoad();
  }

  bindEvents() {
    document.getElementById("refreshBtn").addEventListener("click", () => {
      this.scanForVideos();
    });

    document
      .getElementById("openSidePanelBtn")
      .addEventListener("click", () => {
        this.openSidePanel();
      });

    // Update the download button click handler
    document.addEventListener("click", async (e) => {
      if (e.target.classList.contains("download-btn")) {
        const videoItem = e.target.closest(".video-item");
        const url = videoItem.dataset.url;
        const title = videoItem.dataset.title || "video";
        const filename = this.sanitizeFilename(title) + ".mp4";

        try {
          // Send download request to content script first
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          chrome.tabs.sendMessage(
            tab.id,
            {
              action: "downloadVideo",
              url: url,
              filename: filename,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError);
                this.showError("Failed to start download");
              } else if (response && !response.success) {
                this.showError("Download failed: " + response.error);
              } else {
                this.showSuccess("Download started");
              }
            }
          );
        } catch (error) {
          console.error("Download error:", error);
          this.showError("Failed to start download");
        }
      }
    });
  }

  async loadVideos() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Get stored videos for current tab
      const result = await chrome.storage.local.get([`videos_${tab.id}`]);
      const videos = result[`videos_${tab.id}`] || [];

      this.displayVideos(videos);
    } catch (error) {
      console.error("Error loading videos:", error);
      this.showStatus("Error loading videos", "error");
    }
  }

  async scanForVideos() {
    this.showStatus("Scanning for videos...", "info");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Send message to content script to scan for videos
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "scanVideos",
      });

      if (response?.videos) {
        this.videos = response.videos;
        this.displayVideos(this.videos);

        // Store videos for this tab
        await chrome.storage.local.set({ [`videos_${tab.id}`]: this.videos });

        if (this.videos.length > 0) {
          this.showStatus(`Found ${this.videos.length} video(s)`, "success");
        } else {
          this.showStatus("No videos found on this page", "error");
        }
      } else {
        this.showStatus("No videos found", "error");
      }
    } catch (error) {
      console.error("Error scanning videos:", error);
      this.showStatus(
        "Error scanning page. Please refresh and try again.",
        "error"
      );
    }
  }

  async autoScanAndLoad() {
    try {
      // First try to load existing videos from storage
      await this.loadVideos();

      // Check if we found any videos in storage
      if (this.videos && this.videos.length > 0) {
        this.showStatus(
          `Found ${this.videos.length} video(s) from previous scan`,
          "success"
        );
        return;
      }

      // If no videos in storage, automatically scan the page
      this.showStatus("Auto-scanning page for videos...", "info");
      await this.scanForVideos();
    } catch (error) {
      console.error("Error in auto scan and load:", error);
      this.showStatus("Error loading videos. Try manual scan.", "error");
    }
  }

  displayVideos(videos) {
    const videoList = document.getElementById("videoList");

    if (!videos || videos.length === 0) {
      videoList.innerHTML =
        '<div class="no-videos">No videos found. Try clicking "Scan for Videos" button.</div>';
      return;
    }

    videoList.innerHTML = videos
      .map(
        (video, index) => `
      <div class="video-item" data-url="${video.url}" data-title="${
          video.title
        }">
        <div class="video-title">${this.truncateText(
          video.title || "Unknown Video",
          60
        )}</div>
        <div class="video-info">
          <span class="video-quality">${video.quality || "Unknown"}</span>
          <span class="video-size">${video.size || "Unknown size"}</span>
        </div>
        <button class="download-btn" data-index="${index}" data-url="${
          video.url
        }">
          ⬇️ Download
        </button>
      </div>
    `
      )
      .join("");

    // Add download event listeners
    videoList.querySelectorAll(".download-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        this.downloadVideo(videos[index], e.target);
      });
    });
  }

  async downloadVideo(video, button) {
    try {
      button.disabled = true;
      button.textContent = "⏳ Downloading...";

      // Check if this is a blob URL or protected stream
      if (this.isProtectedUrl(video.url)) {
        await this.handleProtectedDownload(video, button);
        return;
      }

      // Generate filename
      const filename = this.generateFilename(video);

      // Try direct download first
      try {
        button.textContent = "🔄 Starting...";
        this.showStatus("Initiating download...", "info");

        await chrome.downloads.download({
          url: video.url,
          filename: filename,
          saveAs: true,
        });

        button.textContent = "✅ Downloaded";
        this.showStatus(
          "Download started! Opening Download Manager...",
          "success"
        );

        // Automatically open side panel for download tracking
        setTimeout(() => {
          this.openSidePanel();
        }, 500);
      } catch (downloadError) {
        console.log(
          "Direct download failed, trying alternative method:",
          downloadError
        );
        button.textContent = "🔄 Alternative...";
        this.showStatus(
          "Direct download failed, trying alternative method...",
          "info"
        );
        await this.handleAlternativeDownload(video, button);
      }

      setTimeout(() => {
        button.disabled = false;
        button.textContent = "⬇️ Download";
      }, 2000);
    } catch (error) {
      console.error("Download error:", error);
      button.disabled = false;
      button.textContent = "⬇️ Download";
      this.showStatus(
        `Download failed: ${this.getErrorMessage(error)}`,
        "error"
      );
    }
  }

  isProtectedUrl(url) {
    return (
      url.startsWith("blob:") ||
      url.includes("googlevideo.com") ||
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("vimeo.com") ||
      url.includes(".m3u8") ||
      url.includes("stream") ||
      url.includes("manifest") ||
      url.includes("segment") ||
      url.includes("chunk")
    );
  }

  async handleProtectedDownload(video, button) {
    // For blob URLs and protected streams, we need special handling
    try {
      this.showStatus("Processing protected video...", "info");
      button.textContent = "🔄 Processing...";

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Try different methods in order of preference
      let response;

      // Method 1: Try blob download
      this.showStatus("Attempting blob download...", "info");
      button.textContent = "🔄 Blob method...";

      response = await chrome.tabs.sendMessage(tab.id, {
        action: "downloadBlob",
        video: video,
      });

      if (response?.success) {
        button.textContent = "✅ Downloaded";
        this.showStatus("Video downloaded successfully!", "success");
        return;
      }

      // Method 2: Try enhanced alternative download with better progress tracking
      this.showStatus("Trying enhanced recording method...", "info");
      button.textContent = "🔄 Recording...";

      // Start enhanced progress monitor for long recordings
      const progressMonitor = this.startEnhancedProgressMonitor(video, button);

      response = await this.attemptEnhancedDownload(tab.id, video, button);

      clearInterval(progressMonitor);

      if (response?.success) {
        button.textContent = "✅ Downloaded";
        const sizeInfo = response.finalSize
          ? ` (${(response.finalSize / 1024 / 1024).toFixed(1)}MB)`
          : "";
        this.showStatus(`Video downloaded successfully${sizeInfo}!`, "success");
        return;
      }

      // Method 3: Try background script download
      this.showStatus("Trying direct download...", "info");
      button.textContent = "🔄 Direct...";

      response = await chrome.runtime.sendMessage({
        action: "downloadVideo",
        video: video,
      });

      if (response?.success) {
        button.textContent = "✅ Downloaded";
        this.showStatus(
          "Video download started! Check side panel for progress.",
          "success"
        );
        return;
      }

      // If all methods fail, provide URL for manual download
      throw new Error("All download methods failed");
    } catch (error) {
      console.error("Protected download error:", error);

      // Show user-friendly error message based on video type
      let errorMessage = "Download failed: ";
      if (video.url.startsWith("blob:")) {
        errorMessage += "This video uses blob URLs which may be protected";
      } else if (
        video.url.includes("youtube.com") ||
        video.url.includes("youtu.be")
      ) {
        errorMessage += "YouTube videos require special downloaders";
      } else if (video.url.includes("vimeo.com")) {
        errorMessage += "Vimeo videos may be protected";
      } else {
        errorMessage += "Video may be protected or unavailable";
      }

      this.showStatus(errorMessage, "error");

      // Change button to copy URL instead
      button.textContent = "📋 Copy URL";
      button.onclick = () => this.copyVideoUrl(video.url);

      throw error;
    }
  }

  async attemptEnhancedDownload(tabId, video, button) {
    return new Promise((resolve) => {
      // Set up message listener for progress updates
      const progressListener = (message) => {
        if (
          message.action === "streamRecordingProgress" &&
          message.data.url === video.url
        ) {
          const { elapsed, totalBytes } = message.data;
          const sizeMB = (totalBytes / 1024 / 1024).toFixed(1);
          button.textContent = `🔄 ${elapsed}s (${sizeMB}MB)`;
          this.showStatus(
            `Recording: ${elapsed}s captured, ${sizeMB}MB...`,
            "info"
          );
        }
      };

      chrome.runtime.onMessage.addListener(progressListener);

      // Send download request
      chrome.tabs
        .sendMessage(tabId, {
          action: "alternativeDownload",
          video: video,
        })
        .then((response) => {
          chrome.runtime.onMessage.removeListener(progressListener);
          resolve(response);
        })
        .catch((error) => {
          chrome.runtime.onMessage.removeListener(progressListener);
          resolve({ success: false, error: error.message });
        });

      // Add timeout for very long downloads
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(progressListener);
        resolve({ success: false, error: "Download timeout" });
      }, 600000); // 10 minute timeout
    });
  }

  startEnhancedProgressMonitor(video, button) {
    let seconds = 0;
    const monitor = setInterval(() => {
      seconds += 3;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timeStr =
        minutes > 0
          ? `${minutes}m ${remainingSeconds}s`
          : `${remainingSeconds}s`;

      // Only update if button hasn't been updated by progress messages
      if (button.textContent.includes("🔄 Recording")) {
        if (video.duration && !isNaN(video.duration)) {
          const totalDuration = Math.round(video.duration);
          const totalMinutes = Math.floor(totalDuration / 60);
          const totalSeconds = totalDuration % 60;
          const totalTimeStr =
            totalMinutes > 0
              ? `${totalMinutes}m ${totalSeconds}s`
              : `${totalSeconds}s`;

          const percentage = Math.round((seconds / totalDuration) * 100);
          button.textContent = `🔄 ${timeStr}/${totalTimeStr} (${percentage}%)`;
          this.showStatus(
            `Recording progress: ${timeStr} / ${totalTimeStr} (${percentage}%)`,
            "info"
          );
        } else {
          this.showStatus(
            `Recording in progress: ${timeStr} (full length recording)`,
            "info"
          );
        }
      }
    }, 3000);

    return monitor;
  }

  async handleAlternativeDownload(video, button) {
    // Try to download via content script for better access
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "alternativeDownload",
        video: video,
      });

      if (response?.success) {
        button.textContent = "✅ Downloaded";
        this.showStatus("Download started (alternative method)!", "success");
      } else {
        throw new Error("Alternative download method failed");
      }
    } catch (error) {
      console.error("Alternative download error:", error);
      // Fallback to providing the URL for manual download
      this.showStatus(
        "Auto-download failed. Click 'Copy URL' to download manually.",
        "error"
      );
      button.textContent = "📋 Copy URL";
      button.onclick = () => this.copyVideoUrl(video.url);
    }
  }

  async copyVideoUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showStatus("Video URL copied to clipboard!", "success");
    } catch (error) {
      console.error("Copy error:", error);
      this.showStatus("Failed to copy URL", "error");
    }
  }

  getErrorMessage(error) {
    if (error.message.includes("Download interrupted")) {
      return "Download was interrupted";
    } else if (error.message.includes("Network error")) {
      return "Network error - check your connection";
    } else if (error.message.includes("Forbidden")) {
      return "Access denied - video may be protected";
    } else if (error.message.includes("Not found")) {
      return "Video not found or expired";
    } else {
      return "Unknown error occurred";
    }
  }

  generateFilename(video) {
    let filename = video.title || "video";

    // Clean filename
    filename = filename.replace(/[<>:"/\\|?*]/g, "_");
    filename = filename.substring(0, 100); // Limit length

    // Add extension if not present
    const url = new URL(video.url);
    const path = url.pathname;
    const extension = path.split(".").pop().toLowerCase();

    if (
      !filename.includes(".") &&
      ["mp4", "webm", "mkv", "avi", "mov", "flv"].includes(extension)
    ) {
      filename += `.${extension}`;
    } else if (!filename.includes(".")) {
      filename += ".mp4"; // Default extension
    }

    return filename;
  }

  truncateText(text, maxLength) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  showStatus(message, type) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }

  startProgressMonitor(video) {
    let seconds = 0;
    const monitor = setInterval(() => {
      seconds += 3;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timeStr =
        minutes > 0
          ? `${minutes}m ${remainingSeconds}s`
          : `${remainingSeconds}s`;

      if (video.duration && !isNaN(video.duration)) {
        const totalDuration = Math.round(video.duration);
        const totalMinutes = Math.floor(totalDuration / 60);
        const totalSeconds = totalDuration % 60;
        const totalTimeStr =
          totalMinutes > 0
            ? `${totalMinutes}m ${totalSeconds}s`
            : `${totalSeconds}s`;
        this.showStatus(
          `Recording video... ${timeStr} / ${totalTimeStr}`,
          "info"
        );
      } else {
        this.showStatus(
          `Recording video... ${timeStr} (duration unknown)`,
          "info"
        );
      }
    }, 3000);

    return monitor;
  }

  async openSidePanel() {
    try {
      this.showStatus("Opening Download Manager...", "info");

      // Ask background script to open the side panel
      const response = await chrome.runtime.sendMessage({
        action: "openSidePanel",
      });

      if (response?.success) {
        this.showStatus("Download Manager opened successfully!", "success");

        // Close popup after short delay to let user see the side panel
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        this.showStatus("Unable to open Download Manager", "error");
      }
    } catch (error) {
      console.error("Error opening side panel:", error);
      this.showStatus(
        "Error opening Download Manager. Please try again.",
        "error"
      );
    }
  }

  // Helper function to show error messages
  showError(message) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status error`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }

  // Helper function to show success messages
  showSuccess(message) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status success`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }

  async downloadVideo(video) {
    try {
      console.log("Starting download for:", video);

      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error("No active tab found");
      }

      // Generate filename
      const filename =
        this.sanitizeFilename(video.title || "video") +
        this.getExtensionFromUrl(video.url);

      // Send download request to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "downloadVideo",
        url: video.url,
        filename: filename,
      });

      if (response?.success) {
        this.showNotification("Download started successfully", "success");
      } else {
        throw new Error(response?.error || "Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      this.showNotification(`Download failed: ${error.message}`, "error");
    }
  }

  getExtensionFromUrl(url) {
    if (!url) return ".mp4"; // Default extension

    // For blob URLs, default to .mp4
    if (url.startsWith("blob:")) {
      return ".mp4";
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (match) {
        const ext = match[1].toLowerCase();
        if (["mp4", "webm", "mkv", "avi", "mov", "flv"].includes(ext)) {
          return "." + ext;
        }
      }
    } catch (e) {
      console.debug("Could not parse URL for extension:", e);
    }

    return ".mp4"; // Default extension
  }

  sanitizeFilename(filename) {
    // Remove invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  }

  showNotification(message, type = "info") {
    // Implementation of notification display
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.videoDownloaderPopup = new VideoDownloaderPopup();
});
