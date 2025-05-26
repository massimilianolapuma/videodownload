// Side panel script for Video Downloader extension - Video Browser

class VideoDownloaderSidePanel {
  constructor() {
    this.videos = [];
    this.currentTabId = null;
    this.downloads = new Map(); // Track active downloads
    this.init();
  }

  init() {
    console.log("Initializing Video Downloader Side Panel");
    this.bindEvents();
    this.setupMessageListener();
    this.getCurrentTab();
    this.loadVideosForCurrentTab();
  }

  bindEvents() {
    // Rescan button
    document.getElementById("rescanBtn").addEventListener("click", () => {
      this.triggerRescan();
    });

    // Clear videos button
    document.getElementById("clearBtn").addEventListener("click", () => {
      this.clearVideos();
    });

    // Debug button
    document.getElementById("debugBtn").addEventListener("click", () => {
      this.showDebugInfo();
    });
  }

  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case "videosUpdated":
          this.handleVideosUpdated(message.data);
          break;
        case "downloadUpdate":
          this.handleDownloadUpdate(message.data);
          break;
        case "downloadCompleted":
          this.handleDownloadCompleted(message.data);
          break;
        case "downloadError":
          this.handleDownloadError(message.data);
          break;
      }
    });
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        this.currentTabId = tabs[0].id;
        console.log("Current tab ID:", this.currentTabId);
      }
    } catch (error) {
      console.error("Error getting current tab:", error);
    }
  }

  async loadVideosForCurrentTab() {
    if (!this.currentTabId) {
      await this.getCurrentTab();
    }

    if (this.currentTabId) {
      try {
        console.log(`Loading videos for tab ${this.currentTabId}`);
        const result = await chrome.storage.local.get([
          `videos_${this.currentTabId}`,
        ]);
        const videos = result[`videos_${this.currentTabId}`] || [];
        console.log(`Loaded ${videos.length} videos from storage:`, videos);

        this.videos = videos;
        this.renderVideos();
        this.updateStatus("ready", `${videos.length} videos found`);
      } catch (error) {
        console.error("Error loading videos:", error);
        this.updateStatus("error", "Failed to load videos");
      }
    } else {
      console.error("No current tab ID available");
      this.updateStatus("error", "No active tab found");
    }
  }

  async triggerRescan() {
    if (!this.currentTabId) {
      await this.getCurrentTab();
    }

    if (!this.currentTabId) {
      this.updateStatus("error", "No active tab found");
      return;
    }

    this.updateStatus("scanning", "Scanning for videos...");
    this.showScanningIndicator(true);

    try {
      // Send message to background script to trigger rescan
      const response = await chrome.runtime.sendMessage({
        action: "triggerVideoScan",
        tabId: this.currentTabId,
      });

      console.log("Trigger rescan response:", response);

      if (response?.success) {
        // Wait a bit for the scan to complete and then reload videos
        setTimeout(async () => {
          await this.loadVideosForCurrentTab();
          this.showScanningIndicator(false);
        }, 2000);
      } else {
        this.updateStatus("error", "Failed to trigger video scan");
        this.showScanningIndicator(false);
      }
    } catch (error) {
      console.error("Error triggering rescan:", error);
      this.updateStatus("error", "Scan failed: " + error.message);
      this.showScanningIndicator(false);
    }
  }

  async clearVideos() {
    if (this.currentTabId) {
      try {
        await chrome.storage.local.remove([`videos_${this.currentTabId}`]);
        this.videos = [];
        this.renderVideos();
        this.updateStatus("ready", "Videos cleared");
      } catch (error) {
        console.error("Error clearing videos:", error);
      }
    }
  }

  handleVideosUpdated(data) {
    if (data.tabId === this.currentTabId) {
      this.videos = data.videos || [];
      this.renderVideos();
      this.updateStatus("ready", `${this.videos.length} videos found`);
      this.showScanningIndicator(false);
    }
  }

  renderVideos() {
    const videoList = document.getElementById("videoList");
    const emptyState = document.getElementById("emptyState");
    const videoCount = document.getElementById("videoCount");

    // Update video count
    videoCount.textContent = `${this.videos.length} video${
      this.videos.length !== 1 ? "s" : ""
    } detected`;
    videoCount.style.display = this.videos.length > 0 ? "block" : "none";

    if (this.videos.length === 0) {
      videoList.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    videoList.innerHTML = "";

    this.videos.forEach((video, index) => {
      const videoItem = this.createVideoItem(video, index);
      videoList.appendChild(videoItem);
    });
  }

  createVideoItem(video, index) {
    const item = document.createElement("div");
    item.className = "video-item";
    item.dataset.videoIndex = index;

    // Generate thumbnail or placeholder
    const previewHtml = video.poster
      ? `<img src="${video.poster}" alt="Video thumbnail">`
      : `<div class="placeholder">🎥</div>`;

    // Determine video quality/resolution
    const resolution = this.extractResolution(video) || "Unknown";
    const fileSize = this.formatFileSize(video.size);
    const duration = this.formatDuration(video.duration);

    // Generate quality options
    const qualityOptions = this.generateQualityOptions(video);

    item.innerHTML = `
      <div class="video-preview">
        ${previewHtml}
        <div class="play-overlay">▶</div>
      </div>
      <div class="video-info">
        <div class="video-title">${video.title || `Video ${index + 1}`}</div>
        <div class="video-meta">
          ${resolution ? `<span class="resolution">${resolution}</span>` : ""}
          ${fileSize ? `<span class="size">${fileSize}</span>` : ""}
          ${duration ? `<span class="duration">${duration}</span>` : ""}
        </div>
        <div class="video-actions">
          ${
            qualityOptions.length > 1
              ? `
            <select class="quality-select" data-video-index="${index}">
              ${qualityOptions
                .map(
                  (option) =>
                    `<option value="${option.url}">${option.label}</option>`
                )
                .join("")}
            </select>
          `
              : ""
          }
          <button class="download-btn" data-video-index="${index}" data-video-url="${
      video.url
    }">
            📥 Download
          </button>
        </div>
        <div class="progress-container" id="progress-${index}">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="progress-text">0%</div>
        </div>
      </div>
    `;

    // Bind download button event
    const downloadBtn = item.querySelector(".download-btn");
    downloadBtn.addEventListener("click", (e) => {
      this.handleDownload(video, index, e.target);
    });

    // Bind quality selector change
    const qualitySelect = item.querySelector(".quality-select");
    if (qualitySelect) {
      qualitySelect.addEventListener("change", (e) => {
        downloadBtn.dataset.videoUrl = e.target.value;
      });
    }

    return item;
  }

  async handleDownload(video, index, button) {
    const videoUrl = button.dataset.videoUrl;
    const qualitySelect = button.parentElement.querySelector(".quality-select");
    const selectedUrl = qualitySelect ? qualitySelect.value : videoUrl;

    button.disabled = true;
    button.textContent = "⏳ Starting...";

    try {
      // Show progress container
      const progressContainer = document.getElementById(`progress-${index}`);
      progressContainer.classList.add("show");

      // Send download request to background script
      const response = await chrome.runtime.sendMessage({
        action: "downloadVideo",
        video: {
          ...video,
          url: selectedUrl,
          index: index,
        },
      });

      if (response?.success) {
        button.textContent = "⬇️ Downloading...";
      } else {
        throw new Error(response?.error || "Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      button.disabled = false;
      button.textContent = "❌ Failed";
      this.showStatus("error", "Download failed: " + error.message);

      setTimeout(() => {
        button.textContent = "📥 Download";
      }, 3000);
    }
  }

  handleDownloadUpdate(data) {
    const { index, progress } = data;
    if (index === undefined) return;

    const progressContainer = document.getElementById(`progress-${index}`);
    if (!progressContainer) return;

    const progressFill = progressContainer.querySelector(".progress-fill");
    const progressText = progressContainer.querySelector(".progress-text");
    const downloadBtn = document.querySelector(`[data-video-index="${index}"]`);

    if (progressFill && progressText) {
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;
    }

    if (downloadBtn) {
      downloadBtn.textContent = `⬇️ ${Math.round(progress)}%`;
    }
  }

  handleDownloadCompleted(data) {
    const { index, filename } = data;
    if (index === undefined) return;

    const progressContainer = document.getElementById(`progress-${index}`);
    const downloadBtn = document.querySelector(`[data-video-index="${index}"]`);

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = "✅ Completed";

      setTimeout(() => {
        downloadBtn.textContent = "📥 Download";
      }, 3000);
    }

    if (progressContainer) {
      setTimeout(() => {
        progressContainer.classList.remove("show");
      }, 2000);
    }

    this.showStatus("success", `Downloaded: ${filename}`);
  }

  handleDownloadError(data) {
    const { index, error } = data;
    if (index === undefined) return;

    const downloadBtn = document.querySelector(`[data-video-index="${index}"]`);
    const progressContainer = document.getElementById(`progress-${index}`);

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = "❌ Failed";

      setTimeout(() => {
        downloadBtn.textContent = "📥 Download";
      }, 3000);
    }

    if (progressContainer) {
      progressContainer.classList.remove("show");
    }

    this.showStatus("error", `Download failed: ${error}`);
  }

  extractResolution(video) {
    // Try to extract resolution from various sources
    if (video.resolution) return video.resolution;
    if (video.quality) return video.quality;

    // Parse from URL or filename
    const resolutionRegex = /(\d{3,4}p?|\d{3,4}x\d{3,4})/i;
    const urlMatch = video.url?.match(resolutionRegex);
    const titleMatch = video.title?.match(resolutionRegex);

    return urlMatch?.[1] || titleMatch?.[1] || null;
  }

  generateQualityOptions(video) {
    const options = [];

    // Default option
    options.push({
      url: video.url,
      label: this.extractResolution(video) || "Default Quality",
    });

    // Add additional sources if available
    if (video.sources && Array.isArray(video.sources)) {
      video.sources.forEach((source) => {
        if (source.url !== video.url) {
          options.push({
            url: source.url,
            label:
              this.extractResolution(source) || `Quality ${options.length + 1}`,
          });
        }
      });
    }

    return options;
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return null;

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return null;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  updateStatus(type, message) {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    statusDot.className = `status-dot ${type}`;
    statusText.textContent = message;
  }

  showStatus(type, message) {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.className = `status ${type} show`;
    statusMessage.textContent = message;

    setTimeout(() => {
      statusMessage.classList.remove("show");
    }, 4000);
  }

  showScanningIndicator(show) {
    const scanningIndicator = document.getElementById("scanningIndicator");
    const emptyState = document.getElementById("emptyState");

    if (show) {
      scanningIndicator.style.display = "flex";
      emptyState.style.display = "none";
    } else {
      scanningIndicator.style.display = "none";
      if (this.videos.length === 0) {
        emptyState.style.display = "block";
      }
    }
  }

  async showDebugInfo() {
    console.log("=== DEBUG INFO ===");

    // Show current tab info
    console.log("Current tab ID:", this.currentTabId);

    // Show all storage contents
    try {
      const allStorage = await chrome.storage.local.get(null);
      console.log("Storage contents:", allStorage);

      // Look for video-related keys
      const videoKeys = Object.keys(allStorage).filter(
        (key) => key.startsWith("videos_") || key.startsWith("detected_videos_")
      );
      console.log("Video storage keys:", videoKeys);

      // Show specific tab videos
      if (this.currentTabId) {
        const tabVideoKey = `videos_${this.currentTabId}`;
        const detectedVideoKey = `detected_videos_${this.currentTabId}`;

        console.log(
          `Videos for tab ${this.currentTabId}:`,
          allStorage[tabVideoKey] || []
        );
        console.log(
          `Detected videos for tab ${this.currentTabId}:`,
          allStorage[detectedVideoKey] || []
        );
      }

      // Show debug alert with summary
      const debugInfo = {
        currentTabId: this.currentTabId,
        videosInMemory: this.videos.length,
        storageKeys: videoKeys.length,
        totalStorageItems: Object.keys(allStorage).length,
      };

      alert(`Debug Info:\n${JSON.stringify(debugInfo, null, 2)}`);
    } catch (error) {
      console.error("Debug error:", error);
      alert("Debug error: " + error.message);
    }
  }
}

// Initialize side panel when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.videoDownloaderSidePanel = new VideoDownloaderSidePanel();
  });
} else {
  window.videoDownloaderSidePanel = new VideoDownloaderSidePanel();
}
