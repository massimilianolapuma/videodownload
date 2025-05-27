// Video Downloader - Side Panel Script

// Prevent multiple script initializations
if (window.videoDowloaderSidePanelLoaded) {
  console.log("Side panel script already loaded, skipping initialization");
} else {
  window.videoDowloaderSidePanelLoaded = true;
}

// Utility functions - Define these at the top of the file
function sanitizeFilename(filename) {
  // Remove invalid characters and spaces
  return filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 100); // Limit length
}

function getExtensionFromUrl(url) {
  if (!url) return ".mp4";

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

  return ".mp4";
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add to document
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Initialize the side panel
async function initSidePanel() {
  try {
    console.log("Initializing side panel...");

    // Show initial status
    showStatusMessage("Initializing...", "scanning");

    // Set up event listeners first
    setupEventListeners();

    // Initialize download manager
    initDownloadManager();

    // Load videos when panel opens
    await loadVideos();

    // Auto-refresh videos periodically with debouncing
    let refreshTimeout;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(async () => {
        await loadVideos();
      }, 5000); // Wait 5 seconds before refreshing
    };

    setInterval(debouncedRefresh, 15000); // Check every 15 seconds but debounce

    console.log("Side panel initialization complete");
  } catch (error) {
    console.error("Failed to initialize side panel:", error);
    showStatusMessage("Failed to initialize", "error");
  }
}

// Load videos function
async function loadVideos() {
  try {
    // Show scanning indicator
    const scanningIndicator = document.getElementById("scanningIndicator");
    if (scanningIndicator) {
      scanningIndicator.style.display = "flex";
    }
    showStatusMessage("Scanning for videos...", "scanning");

    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      console.log("No active tab found");
      showStatusMessage("No active tab found", "error");
      return;
    }

    // Check if we can inject content script
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      console.log("Cannot inject script into this type of page");
      displayErrorMessage("Cannot access Chrome system pages");
      return;
    }

    try {
      // Try to establish connection with retry logic
      let connected = false;
      let retries = 3;

      while (!connected && retries > 0) {
        try {
          console.log(
            `Attempting to connect to content script (${4 - retries}/3)...`
          );

          // First, try to ping the content script
          const pingResponse = await chrome.tabs.sendMessage(tab.id, {
            action: "ping",
          });

          if (pingResponse?.success) {
            console.log("Content script is ready");
            connected = true;
          } else {
            throw new Error("Invalid ping response");
          }
        } catch (pingError) {
          console.log("Content script not responding, injecting...");

          try {
            // Inject the content script
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"],
            });

            // Wait longer for the content script to initialize
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Try to ping again after injection
            const pingResponse = await chrome.tabs.sendMessage(tab.id, {
              action: "ping",
            });
            if (pingResponse?.success) {
              console.log("Content script ready after injection");
              connected = true;
            } else {
              retries--;
              if (retries > 0) {
                console.log(
                  `Ping failed, retrying... (${retries} attempts left)`
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }
          } catch (injectionError) {
            console.error("Failed to inject content script:", injectionError);
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }
      }

      if (!connected) {
        throw new Error(
          "Could not establish connection to content script after 3 attempts"
        );
      }

      // Now request videos from content script
      console.log("Requesting video scan...");
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "scanVideos",
      });

      if (response?.videos) {
        console.log(`Found ${response.videos.length} videos`);
        debouncedUpdateVideoDisplay(response.videos);
      } else {
        console.log("No videos found in response");
        debouncedUpdateVideoDisplay([]);
      }
    } catch (innerError) {
      console.error("Error communicating with content script:", innerError);

      // Show appropriate error based on the error type
      if (innerError.message.includes("Cannot access")) {
        displayErrorMessage("Cannot access this page. Try refreshing.");
      } else if (innerError.message.includes("connection")) {
        displayErrorMessage(
          "Connection failed. Please refresh the page and try again."
        );
      } else {
        displayErrorMessage(
          "Failed to scan for videos. Please refresh the page."
        );
      }
    }
  } catch (error) {
    console.error("Error loading videos:", error);
    displayErrorMessage();
  }
}

// Display videos in the UI
function displayVideos(videos) {
  updateVideoDisplay(videos);
}

// Create video element with horizontal layout inspired by Video DownloadHelper
function createVideoElement(video, index) {
  const div = document.createElement("div");
  div.className = "video-item desiderata-layout";
  div.setAttribute("status", "downloadable");
  div.style.setProperty("--order", index);

  // Get video format, quality, and source
  const format = getVideoContainer(video);
  const videoSource = getVideoSource(video.url || "");
  const quality = video.quality || "Unknown";
  const size = video.size ? `~${video.size}` : "";

  // Use poster image if available, or fallback
  const bgStyle = video.poster
    ? `background-image: url('${video.poster}')`
    : `background: linear-gradient(135deg, var(--system-purple) 0%, var(--system-blue) 100%)`;

  // HTML structure matching desiderata
  div.innerHTML = `
    <div class="video-preview desiderata-preview" style="${bgStyle}">
      <div class="favicon desiderata-favicon" style="background-image: url('${
        videoSource.icon
      }')"></div>
    </div>
    <div class="desiderata-main">
      <div class="desiderata-row desiderata-top-row">
        <span class="desiderata-tag desiderata-format">${
          videoSource.name || format
        }</span>
        <span class="desiderata-tag desiderata-icons">
          <span class="icon">🎬</span>${
            video.hasAudio ? '<span class="icon">🎵</span>' : ""
          }
        </span>
        <span class="desiderata-title" title="${
          video.title || `Video ${index + 1}`
        }">${video.title || `Video ${index + 1}`}</span>
        <span class="desiderata-size">${size}</span>
        <button class="desiderata-close" title="Remove">×</button>
      </div>
      <div class="desiderata-row desiderata-bottom-row">
        <div class="desiderata-dropdown-group">
          <button class="desiderata-dropdown-btn">
            <span class="dropdown-format">${format}</span>
            <span class="dropdown-quality">${quality}</span>
            <span class="dropdown-caret">▼</span>
          </button>
        </div>
        <button class="desiderata-download-btn">
          <span class="download-icon">⬇️</span>
          <span class="download-label">Download</span>
        </button>
      </div>
    </div>
  `;

  // Hide/close button event
  div.querySelector(".desiderata-close").onclick = (e) => {
    e.preventDefault();
    div.style.display = "none";
    // Optionally update count, etc.
  };

  // Download button event
  div.querySelector(".desiderata-download-btn").onclick = (e) => {
    e.preventDefault();
    handleDownload(video, div.querySelector(".desiderata-download-btn"));
  };

  // Dropdown event (future: show menu)
  div.querySelector(".desiderata-dropdown-btn").onclick = (e) => {
    e.preventDefault();
    // TODO: Implement dropdown menu for quality/format selection
  };

  return div;
}

// Create video preview with real thumbnails when available
function createVideoPreview(video, index) {
  // Check if we have a poster image
  if (video.poster && video.poster !== "null" && video.poster.trim() !== "") {
    return `
      <div class="video-preview">
        <img src="${video.poster}" alt="Video thumbnail" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <div class="placeholder" style="display: none;">
          <div class="play-overlay">▶</div>
        </div>
      </div>
    `;
  }

  // If we have access to the video element, try to capture a frame
  if (video.element && video.element.videoWidth > 0) {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = video.element.videoWidth;
      canvas.height = video.element.videoHeight;

      // Draw current frame
      ctx.drawImage(video.element, 0, 0);
      const frameDataURL = canvas.toDataURL("image/jpeg", 0.7);

      return `
        <div class="video-preview">
          <img src="${frameDataURL}" alt="Video frame" style="object-fit: cover;">
        </div>
      `;
    } catch (error) {
      console.log(`Could not capture frame for video ${index + 1}:`, error);
    }
  }

  // Fallback to placeholder with play button
  return `
    <div class="video-preview">
      <div class="placeholder">
        <div class="play-overlay">▶</div>
      </div>
    </div>
  `;
}

// Display no videos message
function displayNoVideosMessage() {
  updateVideoDisplay([]); // This will show the empty state
}

// Display error message with custom text
function displayErrorMessage(customMessage) {
  const emptyState = document.getElementById("emptyState");
  const videoList = document.getElementById("videosList"); // Updated to match HTML
  const totalVideos = document.getElementById("totalVideos");

  if (totalVideos) totalVideos.textContent = "0";
  if (videoList) videoList.innerHTML = "";

  if (emptyState) {
    emptyState.innerHTML = `
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Connection Error</div>
      <div class="empty-state-description">${
        customMessage ||
        "Failed to load videos. Please refresh the page and try again."
      }</div>
      <button class="btn" id="retry-btn">
        <span>🔄</span>
        <span>Retry</span>
      </button>
    `;
    emptyState.style.display = "flex";
  }

  showStatusMessage(customMessage || "Error occurred", "error");
}

// Set up event listeners
function setupEventListeners() {
  // Download button click handler (for dynamically created buttons)
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("download-btn")) {
      const video = JSON.parse(e.target.dataset.video);
      await handleDownload(video, e.target);
    }

    // Handle retry buttons in error states
    if (e.target.id === "force-scan-btn") {
      await forceScan();
    }

    if (e.target.id === "retry-btn") {
      await loadVideos();
    }
  });

  // Scan button (matches HTML ID: scanBtn)
  const scanBtn = document.getElementById("scanBtn");
  if (scanBtn) {
    scanBtn.addEventListener("click", async () => {
      console.log("Scan button clicked");
      showStatusMessage("Scanning for videos...", "scanning");
      await loadVideos();
    });
  }

  // Clear button (matches HTML ID: clearBtn)
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      console.log("Clear button clicked");
      clearVideoList();
      showStatusMessage("Video list cleared", "success");
    });
  }

  // Legacy button support for older HTML versions
  const rescanBtn = document.getElementById("rescanBtn");
  if (rescanBtn) {
    rescanBtn.addEventListener("click", async () => {
      console.log("Rescan button clicked");
      showStatusMessage("Rescanning for videos...", "scanning");
      await loadVideos();
    });
  }

  const forceReloadBtn = document.getElementById("forceReloadBtn");
  if (forceReloadBtn) {
    forceReloadBtn.addEventListener("click", async () => {
      console.log("Force reload button clicked");
      showStatusMessage("Force scanning...", "scanning");
      await forceScan();
    });
  }

  const debugBtn = document.getElementById("debugBtn");
  if (debugBtn) {
    debugBtn.addEventListener("click", async () => {
      console.log("Debug button clicked");
      await toggleDebugPanel();
    });
  }
}

// Handle download with progress tracking
async function handleDownload(video, downloadButton = null) {
  console.log("Starting download for video:", video);

  // Find the progress container for this video
  const videoItem = downloadButton?.closest(".video-item");
  const progressContainer = videoItem?.querySelector(".video-progress");
  const progressFill = videoItem?.querySelector(".progress-fill");
  const progressText = videoItem?.querySelector(".progress-text");

  try {
    // Show progress container
    if (progressContainer) {
      progressContainer.style.display = "block";
      progressContainer.classList.add("show");
    }
    if (progressText) {
      progressText.textContent = "Initializing download...";
    }
    if (downloadButton) {
      downloadButton.disabled = true;
      downloadButton.textContent = "⏳ Downloading...";
    }

    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new Error("No active tab found");
    }

    if (progressText) {
      progressText.textContent = "Connecting to page...";
    }

    // Ensure content script is loaded with retry logic
    let connected = false;
    let retries = 3;

    while (!connected && retries > 0) {
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, {
          action: "ping",
        });
        if (pingResponse?.success) {
          connected = true;
        } else {
          throw new Error("Invalid ping response");
        }
      } catch (pingError) {
        console.log("Content script not responding for download, injecting...");
        if (progressText) {
          progressText.textContent = "Loading download script...";
        }

        try {
          // Inject content script if not loaded
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try ping again
          const pingResponse = await chrome.tabs.sendMessage(tab.id, {
            action: "ping",
          });
          if (pingResponse?.success) {
            connected = true;
          } else {
            retries--;
          }
        } catch (injectionError) {
          console.error("Download injection failed:", injectionError);
          retries--;
        }
      }

      if (!connected && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!connected) {
      throw new Error(
        "Could not establish connection to content script for download"
      );
    }

    if (progressText) {
      progressText.textContent = "Starting download...";
    }
    if (progressFill) {
      progressFill.style.width = "20%";
    }

    // Generate filename using the utility functions defined above
    const filename =
      sanitizeFilename(video.title || "video") + getExtensionFromUrl(video.url);

    // Send download request to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "downloadVideo",
      url: video.url,
      filename: filename,
    });

    if (response?.success) {
      if (progressFill) {
        progressFill.style.width = "100%";
      }
      if (progressText) {
        progressText.textContent = "Download completed!";
      }
      showNotification("Download started successfully", "success");

      // Hide progress after 3 seconds
      setTimeout(() => {
        if (progressContainer) {
          progressContainer.style.display = "none";
          progressContainer.classList.remove("show");
        }
        if (downloadButton) {
          downloadButton.disabled = false;
          downloadButton.textContent = "📥 Download";
        }
      }, 3000);
    } else {
      throw new Error(response?.error || "Download failed");
    }
  } catch (error) {
    console.error("Download error:", error);

    // Show error in progress
    if (progressText) {
      progressText.textContent = `Error: ${error.message}`;
    }
    if (progressFill) {
      progressFill.style.width = "0%";
      progressFill.style.background = "#dc3545";
    }

    showNotification(`Download failed: ${error.message}`, "error");

    // Hide progress and reset button after 5 seconds
    setTimeout(() => {
      if (progressContainer) {
        progressContainer.style.display = "none";
        progressContainer.classList.remove("show");
      }
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.textContent = "📥 Download";
      }
      if (progressFill) {
        progressFill.style.background = "#28a745";
      }
    }, 5000);
  }
}

// Force scan
async function forceScan() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new Error("No active tab found");
    }

    showNotification("Scanning for videos...", "info");

    // Ensure content script is loaded with retry logic
    let connected = false;
    let retries = 3;

    while (!connected && retries > 0) {
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, {
          action: "ping",
        });
        if (pingResponse?.success) {
          connected = true;
        } else {
          throw new Error("Invalid ping response");
        }
      } catch (pingError) {
        console.log(
          "Content script not responding for force scan, injecting..."
        );

        try {
          // Inject content script if not loaded
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try ping again
          const pingResponse = await chrome.tabs.sendMessage(tab.id, {
            action: "ping",
          });
          if (pingResponse?.success) {
            connected = true;
          } else {
            retries--;
          }
        } catch (injectionError) {
          console.error("Force scan injection failed:", injectionError);
          retries--;
        }
      }

      if (!connected && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!connected) {
      throw new Error(
        "Could not establish connection to content script for force scan"
      );
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "forceScan",
    });

    if (response?.videos) {
      updateVideoDisplay(response.videos);
      showStatusMessage(`Found ${response.videos.length} videos`, "success");
    } else {
      updateVideoDisplay([]);
      showStatusMessage("No videos found", "warning");
    }
  } catch (error) {
    console.error("Force scan error:", error);
    showNotification("Scan failed", "error");
  }
}

// Status message functions
function showStatusMessage(message, type = "info") {
  const statusElement = document.getElementById("statusMessage");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  // Show status message if element exists
  if (statusElement && type !== "scanning" && type !== "success") {
    statusElement.textContent = message;
    statusElement.className = `status show ${type}`;

    // Hide after 3 seconds
    setTimeout(() => {
      statusElement.classList.remove("show");
    }, 3000);
  } else if (statusElement && (type === "scanning" || type === "success")) {
    // Hide the status message for scanning and success - we'll only use the header indicator
    statusElement.classList.remove("show");
  }

  // Update status indicator in header
  if (statusDot && statusText) {
    if (type === "scanning") {
      statusText.textContent = "Scanning...";
      statusDot.className = "status-dot scanning";
    } else if (type === "error") {
      statusText.textContent = message;
      statusDot.className = "status-dot error";
    } else if (type === "success") {
      statusText.textContent = message;
      statusDot.className = "status-dot success";
    } else {
      statusText.textContent = message;
      statusDot.className = "status-dot";
    }
  }

  console.log(`Status: ${message} (${type})`);
}

function hideStatusMessage() {
  const statusElement = document.getElementById("statusMessage");
  if (statusElement) {
    statusElement.classList.remove("show");
  }
}

// Clear video list function
function clearVideoList() {
  const videoList = document.getElementById("videosList"); // Updated to match HTML
  const totalVideos = document.getElementById("totalVideos");
  const emptyState = document.getElementById("emptyState");

  if (videoList) {
    videoList.innerHTML = "";
  }

  if (totalVideos) {
    totalVideos.textContent = "0";
  }

  if (emptyState) {
    emptyState.style.display = "flex";
  }

  // Clear stored videos
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.storage.local.remove([`videos_${tabs[0].id}`]);
    }
  });
}

// Debug panel toggle function
async function toggleDebugPanel() {
  const debugPanel = document.getElementById("debugPanel");
  const debugContent = document.getElementById("debugContent");

  if (!debugPanel || !debugContent) return;

  if (debugPanel.style.display === "none" || !debugPanel.style.display) {
    // Show debug panel and load debug info
    debugPanel.style.display = "block";
    debugContent.textContent = "Loading debug information...";

    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Try to get content script status
      let contentScriptStatus = "Not connected";
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, {
          action: "ping",
        });
        contentScriptStatus = pingResponse?.success
          ? "Connected"
          : "Error response";
      } catch (e) {
        contentScriptStatus = `Error: ${e.message}`;
      }

      // Get storage info
      const storage = await chrome.storage.local.get();

      const debugInfo = {
        timestamp: new Date().toISOString(),
        currentTab: {
          id: tab?.id,
          url: tab?.url,
          title: tab?.title?.substring(0, 50) + "...",
        },
        contentScriptStatus,
        extensionStorage: storage,
        userAgent: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version,
      };

      debugContent.textContent = JSON.stringify(debugInfo, null, 2);
    } catch (error) {
      debugContent.textContent = `Debug error: ${error.message}`;
    }
  } else {
    // Hide debug panel
    debugPanel.style.display = "none";
  }
}

// Debounced video display update to prevent flashing
window.displayUpdateTimeout = window.displayUpdateTimeout || null;
function debouncedUpdateVideoDisplay(videos) {
  clearTimeout(window.displayUpdateTimeout);
  window.displayUpdateTimeout = setTimeout(() => {
    updateVideoDisplay(videos);
  }, 1000); // Wait 1 second before updating to reduce flashing
}

// Update display functions to match the HTML structure
function updateVideoDisplay(videos) {
  const videoList = document.getElementById("videosList"); // Updated to match HTML
  const totalVideos = document.getElementById("totalVideos");
  const emptyState = document.getElementById("emptyState");
  const scanningIndicator = document.getElementById("scanningIndicator");

  // Hide scanning indicator
  if (scanningIndicator) {
    scanningIndicator.style.display = "none";
  }

  if (!videoList) return;

  // Update statistics
  if (totalVideos) {
    totalVideos.textContent = videos ? videos.length : 0;
  }

  if (videos && videos.length > 0) {
    // Show videos
    if (emptyState) emptyState.style.display = "none";

    videoList.innerHTML = "";
    videos.forEach((video, index) => {
      const videoElement = createVideoElement(video, index);
      videoList.appendChild(videoElement);
    });

    hideStatusMessage();
    showStatusMessage(
      `Found ${videos.length} video${videos.length === 1 ? "" : "s"}`,
      "success"
    );
  } else {
    // Show empty state
    if (emptyState) emptyState.style.display = "flex";
    videoList.innerHTML = "";

    showStatusMessage("No videos found on this page", "info");
  }
}

// Download manager functionality
window.downloadManagerInterval = window.downloadManagerInterval || null;

function initDownloadManager() {
  // Clear any existing interval
  if (window.downloadManagerInterval) {
    clearInterval(window.downloadManagerInterval);
  }

  // Update download progress every 2 seconds
  window.downloadManagerInterval = setInterval(updateDownloadProgress, 2000);

  // Initial load
  updateDownloadProgress();
}

async function updateDownloadProgress() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getDownloadProgress",
    });

    if (response?.downloads) {
      displayDownloads(response.downloads);
    }
  } catch (error) {
    console.error("Failed to get download progress:", error);
  }
}

function displayDownloads(downloads) {
  const downloadList = document.getElementById("activeDownloadsList"); // Updated to match HTML
  const activeDownloads = document.getElementById("activeDownloads");
  const completedDownloads = document.getElementById("completedDownloads");

  if (!downloadList) return;

  const allDownloads = Object.entries(downloads);
  const activeCount = allDownloads.filter(
    ([id, download]) =>
      download.status === "downloading" || download.status === "paused"
  ).length;

  const completedCount = allDownloads.filter(
    ([id, download]) => download.status === "completed"
  ).length;

  // Update statistics
  if (activeDownloads) {
    activeDownloads.textContent = activeCount;
  }
  if (completedDownloads) {
    completedDownloads.textContent = completedCount;
  }

  // Display active downloads
  const activeDownloadsList = allDownloads.filter(
    ([id, download]) =>
      download.status === "downloading" || download.status === "paused"
  );

  if (activeDownloadsList.length === 0) {
    downloadList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-title">No Active Downloads</div>
        <div class="empty-state-description">Downloads will appear here when started</div>
      </div>
    `;
    return;
  }

  downloadList.innerHTML = "";
  activeDownloadsList.forEach(([downloadId, download]) => {
    const downloadElement = createDownloadElement(downloadId, download);
    downloadList.appendChild(downloadElement);
  });
}

function createDownloadElement(downloadId, download) {
  const div = document.createElement("div");
  div.className = "download-item";

  const progress = Math.round(download.progress || 0);
  const speed = formatSpeed(download.speed || 0);
  const downloaded = formatBytes(download.downloaded || 0);
  const total = formatBytes(download.total || 0);
  const status = download.status || "downloading";

  let statusText = "";
  let statusClass = "";
  if (status === "downloading") {
    statusText = `${progress}% • ${speed} • ${downloaded}/${total}`;
    statusClass = "downloading";
  } else if (status === "paused") {
    statusText = `Paused • ${downloaded}/${total}`;
    statusClass = "paused";
  } else if (status === "completed") {
    statusText = `Completed • ${total}`;
    statusClass = "completed";
  } else if (status === "error") {
    statusText = `Failed • ${downloaded}/${total}`;
    statusClass = "error";
  }

  div.innerHTML = `
    <div class="download-info">
      <div class="download-title">${download.title || "Unknown Video"}</div>
      <div class="download-meta">
        <span class="download-status ${statusClass}">${statusText}</span>
      </div>
    </div>
    <div class="download-progress">
      <div class="progress-bar">
        <div class="progress-fill ${statusClass}" style="width: ${progress}%"></div>
      </div>
    </div>
    <div class="download-actions">
      ${
        status === "downloading"
          ? `<button class="btn btn-secondary" onclick="pauseDownload('${downloadId}')">
               <span>⏸️</span>
               <span>Pause</span>
             </button>`
          : status === "paused"
          ? `<button class="btn btn-success" onclick="resumeDownload('${downloadId}')">
               <span>▶️</span>
               <span>Resume</span>
             </button>`
          : ""
      }
      <button class="btn btn-danger" onclick="cancelDownload('${downloadId}')">
        <span>❌</span>
        <span>Cancel</span>
      </button>
    </div>
  `;

  return div;
}

async function pauseDownload(downloadId) {
  try {
    await chrome.runtime.sendMessage({
      action: "pauseDownload",
      downloadId: downloadId,
    });
    showNotification("Download paused", "info");
  } catch (error) {
    console.error("Failed to pause download:", error);
    showNotification("Failed to pause download", "error");
  }
}

async function resumeDownload(downloadId) {
  try {
    await chrome.runtime.sendMessage({
      action: "resumeDownload",
      downloadId: downloadId,
    });
    showNotification("Download resumed", "info");
  } catch (error) {
    console.error("Failed to resume download:", error);
    showNotification("Failed to resume download", "error");
  }
}

async function cancelDownload(downloadId) {
  try {
    await chrome.runtime.sendMessage({
      action: "cancelDownload",
      downloadId: downloadId,
    });
    showNotification("Download cancelled", "info");
  } catch (error) {
    console.error("Failed to cancel download:", error);
    showNotification("Failed to cancel download", "error");
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return (
    parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  );
}

// Helper functions for video item display
function getFaviconUrl() {
  try {
    // Try to get the current page's favicon
    const link =
      document.querySelector("link[rel*='icon']") ||
      document.querySelector("link[rel='shortcut icon']");
    if (link) {
      return link.href;
    }
    // Fallback to default favicon path
    return new URL("/favicon.ico", window.location.origin).href;
  } catch (e) {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="18" font-size="20">🌐</text></svg>';
  }
}

function getVideoFormat(video) {
  // Extract format from URL or default to type
  if (video.url) {
    const url = video.url.toLowerCase();
    if (url.includes("youtube")) return "YouTube";
    if (url.includes("vimeo")) return "Vimeo";
    if (url.includes(".mp4")) return "MP4";
    if (url.includes(".webm")) return "WebM";
    if (url.includes(".mkv")) return "MKV";
  }
  return video.type || "HTML5";
}

// Helper function to get video source information
function getVideoSource(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Common video sources with their icons
    const sources = {
      youtube: { name: "YouTube", icon: "https://www.youtube.com/favicon.ico" },
      "youtu.be": {
        name: "YouTube",
        icon: "https://www.youtube.com/favicon.ico",
      },
      vimeo: { name: "Vimeo", icon: "https://vimeo.com/favicon.ico" },
      dailymotion: {
        name: "DailyMotion",
        icon: "https://www.dailymotion.com/favicon.ico",
      },
      facebook: {
        name: "Facebook",
        icon: "https://www.facebook.com/favicon.ico",
      },
      twitter: { name: "Twitter", icon: "https://twitter.com/favicon.ico" },
      instagram: {
        name: "Instagram",
        icon: "https://www.instagram.com/favicon.ico",
      },
    };

    // Find matching source
    for (const [domain, source] of Object.entries(sources)) {
      if (hostname.includes(domain)) {
        return source;
      }
    }

    // Try to get favicon from hostname
    return {
      name: getVideoContainer(url),
      icon: `https://${hostname}/favicon.ico`,
    };
  } catch (e) {
    console.log("Could not parse URL for video source:", e);
    // Default for invalid URLs
    return {
      name: "Video",
      icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23444" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"%3E%3C/path%3E%3C/svg%3E',
    };
  }
}

function getVideoContainer(video) {
  // Get file container/extension
  if (video.url) {
    const extension = getExtensionFromUrl(video.url).replace(".", "");
    return extension.toUpperCase();
  }
  return "MP4";
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidePanel);
} else {
  initSidePanel();
}
