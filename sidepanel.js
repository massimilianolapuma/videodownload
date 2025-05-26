// Side panel script for Video Downloader extension

class VideoDownloaderSidePanel {
  constructor() {
    this.downloads = new Map(); // Active downloads
    this.completedDownloads = new Map(); // Completed downloads
    this.refreshInterval = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupMessageListener();
    this.loadDownloadHistory();
    this.startProgressRefresh();
  }

  bindEvents() {
    // Clear completed downloads
    document.getElementById("clearCompleted").addEventListener("click", () => {
      this.clearCompletedDownloads();
    });

    // Clear all downloads
    document.getElementById("clearAll").addEventListener("click", () => {
      this.clearAllDownloads();
    });

    // Refresh downloads
    document
      .getElementById("refreshDownloads")
      .addEventListener("click", () => {
        this.refreshDownloads();
      });
  }

  setupMessageListener() {
    // Listen for download updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "downloadUpdate") {
        this.handleDownloadUpdate(message.data);
      } else if (message.action === "downloadStarted") {
        this.handleDownloadStarted(message.data);
      } else if (message.action === "downloadCompleted") {
        this.handleDownloadCompleted(message.data);
      } else if (message.action === "downloadError") {
        this.handleDownloadError(message.data);
      }
    });
  }

  async loadDownloadHistory() {
    try {
      // Load persistent download state from storage
      const result = await chrome.storage.local.get([
        "activeDownloads",
        "completedDownloads",
      ]);

      if (result.activeDownloads) {
        this.downloads = new Map(Object.entries(result.activeDownloads));
      }

      if (result.completedDownloads) {
        this.completedDownloads = new Map(
          Object.entries(result.completedDownloads)
        );
      }

      this.updateUI();
    } catch (error) {
      console.error("Error loading download history:", error);
    }
  }

  async saveDownloadState() {
    try {
      // Save current state to storage
      await chrome.storage.local.set({
        activeDownloads: Object.fromEntries(this.downloads),
        completedDownloads: Object.fromEntries(this.completedDownloads),
      });
    } catch (error) {
      console.error("Error saving download state:", error);
    }
  }

  startProgressRefresh() {
    // Refresh download progress every 2 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshDownloadProgress();
    }, 2000);
  }

  async refreshDownloadProgress() {
    // Request updated progress from background script
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getDownloadProgress",
      });

      if (response?.downloads) {
        // Update progress for active downloads
        for (const [downloadId, progressData] of Object.entries(
          response.downloads
        )) {
          if (this.downloads.has(downloadId)) {
            const download = this.downloads.get(downloadId);
            Object.assign(download, progressData);
            this.downloads.set(downloadId, download);
          }
        }
        this.updateUI();
      }
    } catch (error) {
      console.error("Error refreshing download progress:", error);
    }
  }

  handleDownloadStarted(data) {
    const download = {
      id: data.id,
      title: data.title || "Unknown Video",
      url: data.url,
      filename: data.filename,
      status: "downloading",
      progress: 0,
      downloaded: 0,
      total: data.total || 0,
      speed: 0,
      timeRemaining: 0,
      startTime: Date.now(),
      pausable: data.pausable || false,
    };

    this.downloads.set(data.id, download);
    this.updateUI();
    this.saveDownloadState();
  }

  handleDownloadUpdate(data) {
    if (this.downloads.has(data.id)) {
      const download = this.downloads.get(data.id);

      // Update progress data
      download.progress = data.progress || 0;
      download.downloaded = data.downloaded || 0;
      download.total = data.total || download.total;
      download.speed = data.speed || 0;
      download.timeRemaining = data.timeRemaining || 0;
      download.status = data.status || download.status;

      this.downloads.set(data.id, download);
      this.updateDownloadItem(data.id);
    }
  }

  handleDownloadCompleted(data) {
    if (this.downloads.has(data.id)) {
      const download = this.downloads.get(data.id);
      download.status = "completed";
      download.progress = 100;
      download.endTime = Date.now();

      // Move to completed downloads
      this.completedDownloads.set(data.id, download);
      this.downloads.delete(data.id);

      this.updateUI();
      this.saveDownloadState();
    }
  }

  handleDownloadError(data) {
    if (this.downloads.has(data.id)) {
      const download = this.downloads.get(data.id);
      download.status = "error";
      download.error = data.error;
      download.endTime = Date.now();

      this.downloads.set(data.id, download);
      this.updateUI();
      this.saveDownloadState();
    }
  }

  updateUI() {
    this.updateDownloadCounts();
    this.renderDownloadsList();
  }

  updateDownloadCounts() {
    const activeCount = this.downloads.size;
    const completedCount = this.completedDownloads.size;

    document.getElementById("activeCount").textContent = activeCount;
    document.getElementById("completedCount").textContent = completedCount;
  }

  renderDownloadsList() {
    const container = document.getElementById("downloadsList");
    container.innerHTML = "";

    // Render active downloads
    if (this.downloads.size > 0) {
      const activeSection = document.createElement("div");
      activeSection.className = "downloads-section";
      activeSection.innerHTML = "<h3>Active Downloads</h3>";

      for (const [, download] of this.downloads) {
        activeSection.appendChild(this.createDownloadItem(download, true));
      }

      container.appendChild(activeSection);
    }

    // Render completed downloads
    if (this.completedDownloads.size > 0) {
      const completedSection = document.createElement("div");
      completedSection.className = "downloads-section";
      completedSection.innerHTML = "<h3>Completed Downloads</h3>";

      for (const [, download] of this.completedDownloads) {
        completedSection.appendChild(this.createDownloadItem(download, false));
      }

      container.appendChild(completedSection);
    }

    // Show empty state if no downloads
    if (this.downloads.size === 0 && this.completedDownloads.size === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No downloads yet</p>
          <p>Start downloading videos from web pages to see them here.</p>
        </div>
      `;
    }
  }

  createDownloadItem(download, isActive) {
    const item = document.createElement("div");
    item.className = `download-item ${download.status}`;
    item.dataset.downloadId = download.id;

    const progressBarHtml = isActive
      ? `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${download.progress}%"></div>
        </div>
        <span class="progress-text">${Math.round(download.progress)}%</span>
      </div>
    `
      : "";

    const statusInfo = this.getStatusInfo(download, isActive);
    const actionsHtml = this.getActionsHtml(download, isActive);

    item.innerHTML = `
      <div class="download-info">
        <div class="download-title" title="${
          download.title
        }">${this.truncateText(download.title, 50)}</div>
        <div class="download-details">
          <span class="download-filename">${
            download.filename || "Unknown file"
          }</span>
          ${statusInfo}
        </div>
        ${progressBarHtml}
      </div>
      <div class="download-actions">
        ${actionsHtml}
      </div>
    `;

    return item;
  }

  getStatusInfo(download, isActive) {
    if (!isActive) {
      if (download.status === "completed") {
        const duration = download.endTime - download.startTime;
        return `<span class="status-completed">✅ Completed in ${this.formatDuration(
          duration
        )}</span>`;
      } else if (download.status === "error") {
        return `<span class="status-error">❌ Error: ${
          download.error || "Unknown error"
        }</span>`;
      }
    }

    let info = "";

    if (download.total > 0) {
      info += `<span class="size-info">${this.formatBytes(
        download.downloaded
      )} / ${this.formatBytes(download.total)}</span>`;
    } else if (download.downloaded > 0) {
      info += `<span class="size-info">${this.formatBytes(
        download.downloaded
      )}</span>`;
    }

    if (download.speed > 0) {
      info += ` <span class="speed-info">${this.formatBytes(
        download.speed
      )}/s</span>`;
    }

    if (download.timeRemaining > 0) {
      info += ` <span class="time-remaining">${this.formatDuration(
        download.timeRemaining
      )} left</span>`;
    }

    return info;
  }

  getActionsHtml(download, isActive) {
    if (!isActive) {
      return `
        <button class="action-btn remove-btn" onclick="videoDownloaderSidePanel.removeDownload('${download.id}')">
          🗑️
        </button>
      `;
    }

    let actions = "";

    if (download.status === "downloading" && download.pausable) {
      actions += `
        <button class="action-btn pause-btn" onclick="videoDownloaderSidePanel.pauseDownload('${download.id}')">
          ⏸️
        </button>
      `;
    } else if (download.status === "paused") {
      actions += `
        <button class="action-btn resume-btn" onclick="videoDownloaderSidePanel.resumeDownload('${download.id}')">
          ▶️
        </button>
      `;
    }

    actions += `
      <button class="action-btn cancel-btn" onclick="videoDownloaderSidePanel.cancelDownload('${download.id}')">
        ❌
      </button>
    `;

    return actions;
  }

  updateDownloadItem(downloadId) {
    const item = document.querySelector(`[data-download-id="${downloadId}"]`);
    if (item && this.downloads.has(downloadId)) {
      const download = this.downloads.get(downloadId);

      // Update progress bar
      const progressFill = item.querySelector(".progress-fill");
      const progressText = item.querySelector(".progress-text");
      if (progressFill && progressText) {
        progressFill.style.width = `${download.progress}%`;
        progressText.textContent = `${Math.round(download.progress)}%`;
      }

      // Update status info
      const detailsElement = item.querySelector(".download-details");
      if (detailsElement) {
        const filename =
          detailsElement.querySelector(".download-filename").textContent;
        const statusInfo = this.getStatusInfo(download, true);
        detailsElement.innerHTML = `
          <span class="download-filename">${filename}</span>
          ${statusInfo}
        `;
      }

      // Update item status class
      item.className = `download-item ${download.status}`;
    }
  }

  async pauseDownload(downloadId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "pauseDownload",
        downloadId: downloadId,
      });

      if (response?.success) {
        const download = this.downloads.get(downloadId);
        if (download) {
          download.status = "paused";
          this.downloads.set(downloadId, download);
          this.updateDownloadItem(downloadId);
          this.saveDownloadState();
        }
      }
    } catch (error) {
      console.error("Error pausing download:", error);
    }
  }

  async resumeDownload(downloadId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "resumeDownload",
        downloadId: downloadId,
      });

      if (response?.success) {
        const download = this.downloads.get(downloadId);
        if (download) {
          download.status = "downloading";
          this.downloads.set(downloadId, download);
          this.updateDownloadItem(downloadId);
          this.saveDownloadState();
        }
      }
    } catch (error) {
      console.error("Error resuming download:", error);
    }
  }

  async cancelDownload(downloadId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "cancelDownload",
        downloadId: downloadId,
      });

      if (response?.success) {
        this.downloads.delete(downloadId);
        this.updateUI();
        this.saveDownloadState();
      }
    } catch (error) {
      console.error("Error canceling download:", error);
    }
  }

  removeDownload(downloadId) {
    this.completedDownloads.delete(downloadId);
    this.updateUI();
    this.saveDownloadState();
  }

  clearCompletedDownloads() {
    this.completedDownloads.clear();
    this.updateUI();
    this.saveDownloadState();
  }

  clearAllDownloads() {
    if (
      confirm(
        "Are you sure you want to clear all downloads? This will cancel active downloads."
      )
    ) {
      // Cancel all active downloads
      for (const downloadId of this.downloads.keys()) {
        this.cancelDownload(downloadId);
      }

      this.completedDownloads.clear();
      this.updateUI();
      this.saveDownloadState();
    }
  }

  async refreshDownloads() {
    await this.loadDownloadHistory();
    this.refreshDownloadProgress();
  }

  // Utility methods
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  truncateText(text, maxLength) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  // Clean up when panel is closed
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    for (const observer of this.observers) {
      observer.disconnect();
    }
  }
}

// Initialize side panel when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.videoDownloaderSidePanel = new VideoDownloaderSidePanel();
});

// Clean up when page is unloaded
window.addEventListener("beforeunload", () => {
  if (window.videoDownloaderSidePanel) {
    window.videoDownloaderSidePanel.destroy();
  }
});
