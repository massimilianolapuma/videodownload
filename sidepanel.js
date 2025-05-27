// Side panel script for Video Downloader extension - Video Browser

class VideoDownloaderSidePanel {
  constructor() {
    this.videos = [];
    this.currentTabId = null;
    this.downloads = new Map(); // Track active downloads
    this.init();
  }

  async init() {
    console.log("Initializing Video Downloader Side Panel");
    this.bindEvents();
    this.setupMessageListener();

    // Add a small delay to ensure DOM is fully ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get current tab first, then load videos
    const tabId = await this.getCurrentTab();
    if (tabId) {
      await this.loadVideosForCurrentTab();
    } else {
      // Retry after a delay if tab ID not available initially
      console.log("⏳ Tab ID not available, retrying in 500ms...");
      setTimeout(async () => {
        const retryTabId = await this.getCurrentTab();
        if (retryTabId) {
          await this.loadVideosForCurrentTab();
        } else {
          console.error("❌ Failed to get tab ID after retry");
          this.updateStatus("error", "Could not access browser tab");
        }
      }, 500);
    }
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
      this.toggleDebugPanel();
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
      console.log("Attempting to get current tab...");
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("Tab query returned:", tabs);

      if (tabs && tabs.length > 0 && tabs[0]) {
        this.currentTabId = tabs[0].id;
        console.log("✅ Current tab ID set to:", this.currentTabId);
        return this.currentTabId;
      } else {
        console.warn("⚠️ No active tab found in query result");
        this.currentTabId = null;
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting current tab:", error);
      this.currentTabId = null;
      return null;
    }
  }

  async loadVideosForCurrentTab() {
    console.log("🔄 Starting loadVideosForCurrentTab...");

    if (!this.currentTabId) {
      console.log("No currentTabId, attempting to get current tab...");
      const tabId = await this.getCurrentTab();
      if (!tabId) {
        console.error("❌ Still no tab ID after getCurrentTab()");
        this.updateStatus("error", "No active tab found");
        return;
      }
    }

    console.log(`📂 Loading videos for tab ${this.currentTabId}`);

    try {
      // Test if chrome.storage is available
      if (!chrome.storage || !chrome.storage.local) {
        throw new Error("Chrome storage API not available");
      }

      const storageKey = `videos_${this.currentTabId}`;
      console.log(`🔑 Using storage key: ${storageKey}`);

      const result = await chrome.storage.local.get([storageKey]);
      console.log("📦 Raw storage result:", result);

      const videos = result[storageKey] || [];
      console.log(`📹 Found ${videos.length} videos in storage:`, videos);

      this.videos = videos;
      this.renderVideos();

      const statusMessage =
        videos.length > 0
          ? `${videos.length} videos found`
          : "No videos found - try rescanning";
      this.updateStatus("ready", statusMessage);

      console.log("✅ loadVideosForCurrentTab completed successfully");
    } catch (error) {
      console.error("❌ Error loading videos:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      this.updateStatus("error", `Failed to load videos: ${error.message}`);
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
    console.log(`🎬 Starting renderVideos with ${this.videos.length} videos`);

    const videoList = document.getElementById("videoList");
    const emptyState = document.getElementById("emptyState");
    const videoCount = document.getElementById("videoCount");

    console.log("DOM elements found:", {
      videoList: !!videoList,
      emptyState: !!emptyState,
      videoCount: !!videoCount,
    });

    if (!videoList || !emptyState || !videoCount) {
      console.error("❌ Required DOM elements not found!");
      return;
    }

    // Update video count
    videoCount.textContent = `${this.videos.length} video${
      this.videos.length !== 1 ? "s" : ""
    } detected`;
    videoCount.style.display = this.videos.length > 0 ? "block" : "none";

    if (this.videos.length === 0) {
      console.log("📭 No videos to render, showing empty state");
      videoList.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    console.log("📹 Rendering videos...");
    emptyState.style.display = "none";
    videoList.innerHTML = "";

    this.videos.forEach((video, index) => {
      console.log(`Creating video item ${index + 1}:`, video);
      try {
        const videoItem = this.createVideoItem(video, index);
        videoList.appendChild(videoItem);
        console.log(`✅ Video item ${index + 1} created and appended`);
      } catch (error) {
        console.error(`❌ Error creating video item ${index + 1}:`, error);
      }
    });

    console.log("✅ renderVideos completed");
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

  async toggleDebugPanel() {
    const debugPanel = document.getElementById("debugPanel");
    const debugContent = document.getElementById("debugContent");

    if (debugPanel.classList.contains("show")) {
      debugPanel.classList.remove("show");
    } else {
      debugPanel.classList.add("show");
      await this.updateDebugInfo();
    }
  }

  async updateDebugInfo() {
    const debugContent = document.getElementById("debugContent");
    let debugInfo = "=== DEBUG INFO ===\n\n";

    try {
      // Current tab info
      debugInfo += `Current Tab ID: ${this.currentTabId || "Not set"}\n\n`;

      // Storage contents
      debugInfo += "=== STORAGE CONTENTS ===\n";
      const allStorage = await chrome.storage.local.get(null);

      if (Object.keys(allStorage).length === 0) {
        debugInfo += "Storage is empty\n\n";
      } else {
        for (const [key, value] of Object.entries(allStorage)) {
          if (key.startsWith("videos_")) {
            debugInfo += `${key}: ${
              Array.isArray(value) ? value.length : "Unknown"
            } videos\n`;
            if (Array.isArray(value) && value.length > 0) {
              value.forEach((video, i) => {
                debugInfo += `  ${i + 1}. ${
                  video.title || video.url || "Unknown"
                }\n`;
              });
            }
          } else {
            debugInfo += `${key}: ${typeof value} (${JSON.stringify(
              value
            ).substring(0, 50)}...)\n`;
          }
        }
      }

      debugInfo += "\n=== CURRENT VIDEOS ===\n";
      debugInfo += `Loaded videos count: ${this.videos.length}\n`;
      this.videos.forEach((video, i) => {
        debugInfo += `${i + 1}. ${video.title || "No title"} - ${
          video.url || "No URL"
        }\n`;
      });
    } catch (error) {
      debugInfo += `Error getting debug info: ${error.message}\n`;
    }

    debugContent.textContent = debugInfo;
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
