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

    // Add force reload videos button event
    const forceReloadBtn = document.getElementById("forceReloadBtn");
    if (forceReloadBtn) {
      forceReloadBtn.addEventListener("click", () => {
        console.log("🔄 Force reload button clicked");
        this.forceReloadVideos();
      });
    }

    // Add debug storage check (can be called from console)
    window.debugCheckStorage = () => this.debugCheckStorage();
  }

  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("📨 Sidepanel received message:", message);

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

    // Listen for storage changes to catch videos updated by content script
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && this.currentTabId) {
        const storageKey = `videos_${this.currentTabId}`;
        if (changes[storageKey]) {
          console.log("📦 Storage changed for videos:", changes[storageKey]);
          const newVideos = changes[storageKey].newValue || [];
          this.handleVideosUpdated({
            tabId: this.currentTabId,
            videos: newVideos,
          });
        }
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
      if (!chrome.storage?.local) {
        throw new Error("Chrome storage API not available");
      }

      const storageKey = `videos_${this.currentTabId}`;
      console.log(`🔑 Using storage key: ${storageKey}`);

      const result = await chrome.storage.local.get([storageKey]);
      console.log("📦 Raw storage result:", result);

      const videos = result[storageKey] || [];
      console.log(`📹 Found ${videos.length} videos in storage:`, videos);

      // Additional validation and debugging
      if (videos.length > 0) {
        console.log("🔍 Video data sample:", videos[0]);
        console.log(
          "🔍 All video titles:",
          videos.map((v) => v.title || "No title")
        );

        // Validate each video object
        videos.forEach((video, i) => {
          if (!video || typeof video !== "object") {
            console.error(`❌ Invalid video object at index ${i}:`, video);
          } else if (!video.url) {
            console.warn(`⚠️ Video ${i} missing URL:`, video);
          }
        });
      }

      // Ensure we're setting the array properly
      this.videos = Array.isArray(videos) ? videos : [];
      console.log(
        `🎯 this.videos set to array of length: ${this.videos.length}`
      );

      // Force render with additional logging
      console.log(
        "🎬 About to call renderVideos with videos:",
        this.videos.length
      );
      console.log("🔍 this.videos content before render:", this.videos);
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
        // Don't wait with setTimeout - the videos will be updated via message listener
        // Just show that we're scanning and let the message handler update the UI
        console.log(
          "✅ Video scan triggered successfully, waiting for results..."
        );
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

  async forceReloadVideos() {
    console.log("🔄 Force reloading videos...");
    this.updateStatus("loading", "Force reloading videos...");

    try {
      // Get current tab again
      const tabId = await this.getCurrentTab();
      console.log("🔄 Current tab ID:", tabId);

      if (!tabId) {
        throw new Error("No active tab found");
      }

      // Load videos from storage
      await this.loadVideosForCurrentTab();

      console.log("✅ Force reload completed");
      this.updateStatus("ready", `${this.videos.length} videos loaded`);
    } catch (error) {
      console.error("❌ Force reload failed:", error);
      this.updateStatus("error", "Force reload failed: " + error.message);
    }
  }

  // Add a debugging function to manually check storage
  async debugCheckStorage() {
    console.log("🔍 DEBUG: Checking storage contents...");

    try {
      const allStorage = await chrome.storage.local.get(null);
      console.log("🔍 All storage contents:", allStorage);

      if (this.currentTabId) {
        const storageKey = `videos_${this.currentTabId}`;
        const videos = allStorage[storageKey];
        console.log(`🔍 Videos for current tab (${storageKey}):`, videos);

        if (videos && videos.length > 0) {
          console.log("🔍 Attempting to manually load these videos...");
          this.videos = videos;
          this.renderVideos();
        }
      }
    } catch (error) {
      console.error("❌ Debug storage check failed:", error);
    }
  }

  handleVideosUpdated(data) {
    console.log("🎬 Videos updated received:", data);

    if (data.tabId === this.currentTabId) {
      this.videos = data.videos || [];
      this.renderVideos();

      const statusMessage =
        this.videos.length > 0
          ? `${this.videos.length} videos found`
          : "No videos found - try rescanning";

      this.updateStatus("ready", statusMessage);
      this.showScanningIndicator(false);

      console.log(`✅ Updated sidepanel with ${this.videos.length} videos`);
    } else {
      console.log(
        `⏭️ Ignoring videos update for different tab: ${data.tabId} (current: ${this.currentTabId})`
      );
    }
  }

  renderVideos() {
    console.log(`🎬 Starting renderVideos with ${this.videos.length} videos`);
    console.log("🔍 Videos array content:", this.videos);

    const videoList = document.getElementById("videoList");
    const emptyState = document.getElementById("emptyState");
    const videoCount = document.getElementById("videoCount");

    console.log("DOM elements found:", {
      videoList: !!videoList,
      emptyState: !!emptyState,
      videoCount: !!videoCount,
    });

    if (!videoList) {
      console.error("❌ videoList element not found!");
      return;
    }

    // Always update video count display
    if (videoCount) {
      videoCount.textContent = `${this.videos.length} video${
        this.videos.length !== 1 ? "s" : ""
      } detected`;
      videoCount.style.display = this.videos.length > 0 ? "block" : "none";
    }

    if (this.videos.length === 0) {
      console.log("📭 No videos to render, showing empty state");
      videoList.innerHTML = "";
      if (emptyState) {
        emptyState.style.display = "block";
      }
      return;
    }

    console.log("📹 Rendering videos...");
    if (emptyState) {
      emptyState.style.display = "none";
    }
    videoList.innerHTML = "";

    // Add a simple test to verify videos array is valid
    if (!Array.isArray(this.videos)) {
      console.error(
        "❌ this.videos is not an array:",
        typeof this.videos,
        this.videos
      );
      return;
    }

    this.videos.forEach((video, index) => {
      console.log(`Creating video item ${index + 1}:`, video);

      // Validate video object
      if (!video || typeof video !== "object") {
        console.error(`❌ Invalid video object at index ${index}:`, video);
        return;
      }

      try {
        const videoItem = this.createVideoItem(video, index);
        if (videoItem) {
          videoList.appendChild(videoItem);
          console.log(
            `✅ Video item ${index + 1} created and appended successfully`
          );
        } else {
          console.error(
            `❌ Video item ${index + 1} creation returned null/undefined`
          );
        }
      } catch (error) {
        console.error(`❌ Error creating video item ${index + 1}:`, error);
        console.error("Video data that caused error:", video);
        console.error("Error stack:", error.stack);
      }
    });

    // Final verification
    const renderedItems = videoList.querySelectorAll(".video-item");
    console.log(
      `✅ renderVideos completed. Expected: ${this.videos.length}, Rendered: ${renderedItems.length}`
    );

    if (renderedItems.length !== this.videos.length) {
      console.warn("⚠️ Mismatch between expected and rendered video count!");
      console.log("DOM children in videoList:", videoList.children.length);
      console.log("VideoList innerHTML length:", videoList.innerHTML.length);
    }

    // Force a UI refresh
    videoList.style.display = "none";
    setTimeout(() => {
      videoList.style.display = "flex";
    }, 10);
  }

  createVideoItem(video, index) {
    console.log(`🔧 Creating video item ${index}:`, video);

    // Validate input
    if (!video || typeof video !== "object") {
      console.error(`❌ Invalid video object for item ${index}:`, video);
      return null;
    }

    try {
      const item = document.createElement("div");
      item.className = "video-item";
      item.dataset.videoIndex = index;

      // Generate thumbnail or placeholder
      const previewHtml = video.poster
        ? `<img src="${video.poster}" alt="Video thumbnail">`
        : `<div class="placeholder">🎥</div>`;

      // Determine video quality/resolution - with safe fallbacks
      const resolution = this.extractResolution(video) || "Unknown";
      const fileSize = this.formatFileSize(video.size);
      const duration = this.formatDuration(video.duration);

      // Generate quality options - with error handling
      let qualityOptions;
      try {
        qualityOptions = this.generateQualityOptions(video);
      } catch (error) {
        console.warn(
          `⚠️ Error generating quality options for video ${index}:`,
          error
        );
        qualityOptions = [
          {
            url: video.url || "#",
            label: "Default Quality",
          },
        ];
      }

      // Build the HTML with safe values
      const title = video.title || `Video ${index + 1}`;
      const videoUrl = video.url || "#";

      item.innerHTML = `
        <div class="video-preview">
          ${previewHtml}
          <div class="play-overlay">▶</div>
        </div>
        <div class="video-info">
          <div class="video-title">${title}</div>
          <div class="video-meta">
            ${
              resolution && resolution !== "Unknown"
                ? `<span class="resolution">${resolution}</span>`
                : ""
            }
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
            <button class="download-btn" data-video-index="${index}" data-video-url="${videoUrl}">
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

      // Bind download button event with error handling
      try {
        const downloadBtn = item.querySelector(".download-btn");
        if (downloadBtn) {
          downloadBtn.addEventListener("click", (e) => {
            this.handleDownload(video, index, e.target);
          });
        }

        // Bind quality selector change
        const qualitySelect = item.querySelector(".quality-select");
        if (qualitySelect) {
          qualitySelect.addEventListener("change", (e) => {
            const downloadBtn = item.querySelector(".download-btn");
            if (downloadBtn) {
              downloadBtn.dataset.videoUrl = e.target.value;
            }
          });
        }
      } catch (error) {
        console.error(
          `❌ Error binding events for video item ${index}:`,
          error
        );
      }

      console.log(`✅ Successfully created video item ${index}`);
      return item;
    } catch (error) {
      console.error(`❌ Error in createVideoItem for index ${index}:`, error);
      console.error("Error stack:", error.stack);

      // Return a minimal fallback item
      const fallbackItem = document.createElement("div");
      fallbackItem.className = "video-item";
      fallbackItem.innerHTML = `
        <div class="video-info">
          <div class="video-title">Video ${index + 1} (Error loading)</div>
          <div class="video-meta">
            <span class="resolution">Error</span>
          </div>
        </div>
      `;
      return fallbackItem;
    }
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
