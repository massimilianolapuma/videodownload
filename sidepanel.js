// Video Downloader - Side Panel Script

// Utility functions - Define these at the top of the file
function sanitizeFilename(filename) {
  // Remove invalid characters and spaces
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limit length
}

function getExtensionFromUrl(url) {
  if (!url) return '.mp4';
  
  // For blob URLs, default to .mp4
  if (url.startsWith('blob:')) {
    return '.mp4';
  }
  
    const tabId = await this.getCurrentTab();
    if (tabId) { = new URL(url);
      await this.loadVideosForCurrentTab();
    } else {tch = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      // Retry after a delay if tab ID not available initially
      console.log("⏳ Tab ID not available, retrying in 500ms...");
      setTimeout(async () => {', 'avi', 'mov', 'flv'].includes(ext)) {
        const retryTabId = await this.getCurrentTab();
        if (retryTabId) {
          await this.loadVideosForCurrentTab();
        } else {
          console.error("❌ Failed to get tab ID after retry");
          this.updateStatus("error", "Could not access browser tab");
        }
      }, 500);';
    }
  }
function showNotification(message, type = 'info') {
  bindEvents() {fication element
    // Rescan button = document.createElement('div');
    document.getElementById("rescanBtn").addEventListener("click", () => {
      this.triggerRescan();= message;
    });
  // Style the notification
    // Clear videos buttonxt = `
    document.getElementById("clearBtn").addEventListener("click", () => {
      this.clearVideos();
    });ht: 20px;
    padding: 12px 20px;
    // Debug button4px;
    document.getElementById("debugBtn").addEventListener("click", () => {
      this.toggleDebugPanel();
    });nsition: opacity 0.3s ease;
    max-width: 300px;
    // Add force reload videos button event
    const forceReloadBtn = document.getElementById("forceReloadBtn");
    if (forceReloadBtn) {
      forceReloadBtn.addEventListener("click", () => {
        console.log("🔄 Force reload button clicked");
        this.forceReloadVideos();
      });'success':
    } notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
    // Add debug storage check (can be called from console)
    window.debugCheckStorage = () => this.debugCheckStorage();
  }   notification.style.backgroundColor = '#f44336';
      notification.style.color = 'white';
  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("📨 Sidepanel received message:", message);
      break;
      switch (message.action) {
        case "videosUpdated":groundColor = '#2196F3';
          this.handleVideosUpdated(message.data);
          break;
        case "downloadUpdate":
          this.handleDownloadUpdate(message.data);
          break;
        case "downloadCompleted":seconds
          this.handleDownloadCompleted(message.data);
          break;.style.opacity = '0';
        case "downloadError":
          this.handleDownloadError(message.data);
          break;tion.remove();
      }
    });300);
  }, 3000);
    // Listen for storage changes to catch videos updated by content script
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && this.currentTabId) {Video Browser
        const storageKey = `videos_${this.currentTabId}`;
        if (changes[storageKey]) {
          console.log("📦 Storage changed for videos:", changes[storageKey]);
          const newVideos = changes[storageKey].newValue || [];
          this.handleVideosUpdated({
            tabId: this.currentTabId,ack active downloads
            videos: newVideos,
          });
        }
      } init() {
    });sole.log("Initializing Video Downloader Side Panel");
  } this.bindEvents();
    this.setupMessageListener();
  async getCurrentTab() {
    try {d a small delay to ensure DOM is fully ready
      console.log("Attempting to get current tab..."); 100));
      const tabs = await chrome.tabs.query({
        active: true,b first, then load videos
        currentWindow: true,.getCurrentTab();
      });abId) {
      console.log("Tab query returned:", tabs);
    } else {
      if (tabs && tabs.length > 0 && tabs[0]) {lable initially
        this.currentTabId = tabs[0].id;le, retrying in 500ms...");
        console.log("✅ Current tab ID set to:", this.currentTabId);
        return this.currentTabId;this.getCurrentTab();
      } else {tryTabId) {
        console.warn("⚠️ No active tab found in query result");
        this.currentTabId = null;
        return null;ror("❌ Failed to get tab ID after retry");
      }   this.updateStatus("error", "Could not access browser tab");
    } catch (error) {
      console.error("❌ Error getting current tab:", error);
      this.currentTabId = null;
      return null;
    }
  }indEvents() {
    // Rescan button
  async loadVideosForCurrentTab() {Btn").addEventListener("click", () => {
    console.log("🔄 Starting loadVideosForCurrentTab...");
    });
    if (!this.currentTabId) {
      console.log("No currentTabId, attempting to get current tab...");
      const tabId = await this.getCurrentTab();tListener("click", () => {
      if (!tabId) {eos();
        console.error("❌ Still no tab ID after getCurrentTab()");
        this.updateStatus("error", "No active tab found");
        return;tton
      }ument.getElementById("debugBtn").addEventListener("click", () => {
    } this.toggleDebugPanel();
    });
    console.log(`📂 Loading videos for tab ${this.currentTabId}`);
    // Add force reload videos button event
    try { forceReloadBtn = document.getElementById("forceReloadBtn");
      // Test if chrome.storage is available
      if (!chrome.storage?.local) {er("click", () => {
        throw new Error("Chrome storage API not available");
      } this.forceReloadVideos();
      });
      const storageKey = `videos_${this.currentTabId}`;
      console.log(`🔑 Using storage key: ${storageKey}`);
    // Add debug storage check (can be called from console)
      const result = await chrome.storage.local.get([storageKey]);
      console.log("📦 Raw storage result:", result);

      const videos = result[storageKey] || [];
      console.log(`📹 Found ${videos.length} videos in storage:`, videos);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Additional validation and debuggingsage:", message);
      if (videos.length > 0) {
        console.log("🔍 Video data sample:", videos[0]);
        console.log(Updated":
          "🔍 All video titles:",d(message.data);
          videos.map((v) => v.title || "No title")
        );se "downloadUpdate":
          this.handleDownloadUpdate(message.data);
        // Validate each video object
        videos.forEach((video, i) => {
          if (!video || typeof video !== "object") {;
            console.error(`❌ Invalid video object at index ${i}:`, video);
          } else if (!video.url) {
            console.warn(`⚠️ Video ${i} missing URL:`, video);
          }reak;
        });
      }

      // Ensure we're setting the array properlys updated by content script
      this.videos = Array.isArray(videos) ? videos : [];ame) => {
      console.log( === "local" && this.currentTabId) {
        `🎯 this.videos set to array of length: ${this.videos.length}`
      );if (changes[storageKey]) {
          console.log("📦 Storage changed for videos:", changes[storageKey]);
      // Force render with additional loggingy].newValue || [];
      console.log(dleVideosUpdated({
        "🎬 About to call renderVideos with videos:",
        this.videos.lengtheos,
      );  });
      console.log("🔍 this.videos content before render:", this.videos);
      this.renderVideos();
    });
      const statusMessage =
        videos.length > 0
          ? `${videos.length} videos found`
          : "No videos found - try rescanning";
      this.updateStatus("ready", statusMessage);...");
      const tabs = await chrome.tabs.query({
      console.log("✅ loadVideosForCurrentTab completed successfully");
    } catch (error) {: true,
      console.error("❌ Error loading videos:", error);
      console.error("Error details:", {, tabs);
        name: error.name,
        message: error.message, 0 && tabs[0]) {
        stack: error.stack, tabs[0].id;
      });onsole.log("✅ Current tab ID set to:", this.currentTabId);
      this.updateStatus("error", `Failed to load videos: ${error.message}`);
    } } else {
  }     console.warn("⚠️ No active tab found in query result");
        this.currentTabId = null;
  async triggerRescan() {
    if (!this.currentTabId) {
      await this.getCurrentTab();
    } console.error("❌ Error getting current tab:", error);
      this.currentTabId = null;
    if (!this.currentTabId) {
      this.updateStatus("error", "No active tab found");
      return;
    }
  async loadVideosForCurrentTab() {
    this.updateStatus("scanning", "Scanning for videos...");
    this.showScanningIndicator(true);
    if (!this.currentTabId) {
    try {sole.log("No currentTabId, attempting to get current tab...");
      // Send message to background script to trigger rescan
      const response = await chrome.runtime.sendMessage({
        action: "triggerVideoScan",ab ID after getCurrentTab()");
        tabId: this.currentTabId,, "No active tab found");
      });eturn;
      }
      console.log("Trigger rescan response:", response);

      if (response?.success) {deos for tab ${this.currentTabId}`);
        // Don't wait with setTimeout - the videos will be updated via message listener
        // Just show that we're scanning and let the message handler update the UI
        console.log(ome.storage is available
          "✅ Video scan triggered successfully, waiting for results..."
        );row new Error("Chrome storage API not available");
      } else {
        this.updateStatus("error", "Failed to trigger video scan");
        this.showScanningIndicator(false);rrentTabId}`;
      }onsole.log(`🔑 Using storage key: ${storageKey}`);
    } catch (error) {
      console.error("❌ Error triggering rescan:", error);ageKey]);
      let errorMessage = "Scan failed: " + error.message;

      if (error.message.includes("Could not establish connection")) {
        errorMessage = "Extension not ready - try refreshing the page";s);
      } else if (error.message.includes("content script")) {
        errorMessage = "Page not ready - try refreshing";
      }f (videos.length > 0) {
        console.log("🔍 Video data sample:", videos[0]);
      this.updateStatus("error", errorMessage);
      this.showScanningIndicator(false);
    }     videos.map((v) => v.title || "No title")
  }     );

  async clearVideos() {h video object
    if (this.currentTabId) {o, i) => {
      try {f (!video || typeof video !== "object") {
        await chrome.storage.local.remove([`videos_${this.currentTabId}`]);
        this.videos = [];eo.url) {
        this.renderVideos(); Video ${i} missing URL:`, video);
        this.updateStatus("ready", "Videos cleared");
      } catch (error) {
        console.error("Error clearing videos:", error);
      }
    } // Ensure we're setting the array properly
  }   this.videos = Array.isArray(videos) ? videos : [];
      console.log(
  async forceReloadVideos() {o array of length: ${this.videos.length}`
    console.log("🔄 Force reloading videos with fresh scan...");
    this.updateStatus("loading", "Force scanning for videos...");
      // Force render with additional logging
    try {sole.log(
      // Get current tabl renderVideos with videos:",
      const tabId = await this.getCurrentTab();
      console.log("🔄 Current tab ID:", tabId);
      console.log("🔍 this.videos content before render:", this.videos);
      if (!tabId) {deos();
        throw new Error("No active tab found");
      }onst statusMessage =
        videos.length > 0
      // Send forceScan message to content script for a fresh scan
      console.log("📨 Sending forceScan message to content script...");
      const response = await chrome.tabs.sendMessage(tabId, {
        action: "forceScan",
      });sole.log("✅ loadVideosForCurrentTab completed successfully");
    } catch (error) {
      if (response && response.videos) {eos:", error);
        console.log("Error details:", {
          `✅ Force scan completed - found ${response.videos.length} videos`
        );ssage: error.message,
        this.videos = response.videos;
        this.renderVideos();
        this.updateStatus(rror", `Failed to load videos: ${error.message}`);
          "ready",
          `${this.videos.length} videos found (fresh scan)`
        );
      } else {rRescan() {
        console.log("⚠️ No videos found in force scan");
        this.videos = [];ntTab();
        this.renderVideos();
        this.updateStatus("ready", "No videos found (fresh scan)");
      }(!this.currentTabId) {
    } catch (error) {us("error", "No active tab found");
      console.error("❌ Force reload failed:", error);
      this.updateStatus("error", "Force reload failed: " + error.message);

      // Fallback to loading from storageng for videos...");
      console.log("🔄 Falling back to storage reload...");
      await this.loadVideosForCurrentTab();
    }ry {
  }   // Send message to background script to trigger rescan
      const response = await chrome.runtime.sendMessage({
  // Add a debugging function to manually check storage
  async debugCheckStorage() {bId,
    console.log("🔍 DEBUG: Checking storage contents...");

    try {sole.log("Trigger rescan response:", response);
      const allStorage = await chrome.storage.local.get(null);
      console.log("🔍 All storage contents:", allStorage);
        // Don't wait with setTimeout - the videos will be updated via message listener
      if (this.currentTabId) {e scanning and let the message handler update the UI
        const storageKey = `videos_${this.currentTabId}`;
        const videos = allStorage[storageKey];, waiting for results..."
        console.log(`🔍 Videos for current tab (${storageKey}):`, videos);
      } else {
        if (videos && videos.length > 0) { to trigger video scan");
          console.log("🔍 Attempting to manually load these videos...");
          this.videos = videos;
          this.renderVideos();
        }sole.error("❌ Error triggering rescan:", error);
      }et errorMessage = "Scan failed: " + error.message;
    } catch (error) {
      console.error("❌ Debug storage check failed:", error);tion")) {
    }   errorMessage = "Extension not ready - try refreshing the page";
  }   } else if (error.message.includes("content script")) {
        errorMessage = "Page not ready - try refreshing";
  handleVideosUpdated(data) {
    console.log("🎬 Videos updated received:", data);
      this.updateStatus("error", errorMessage);
    if (data.tabId === this.currentTabId) {
      this.videos = data.videos || [];
      this.renderVideos();

      const statusMessage =
        this.videos.length > 0
          ? `${this.videos.length} videos found`
          : "No videos found - try rescanning";eos_${this.currentTabId}`]);
        this.videos = [];
      this.updateStatus("ready", statusMessage);
      this.showScanningIndicator(false);os cleared");
      } catch (error) {
      console.log(`✅ Updated sidepanel with ${this.videos.length} videos`);
    } else {
      console.log(
        `⏭️ Ignoring videos update for different tab: ${data.tabId} (current: ${this.currentTabId})`
      );
    }nc forceReloadVideos() {
  } console.log("🔄 Force reloading videos with fresh scan...");
    this.updateStatus("loading", "Force scanning for videos...");
  renderVideos() {
    console.log(`🎬 Starting renderVideos with ${this.videos.length} videos`);
    console.log("🔍 Videos array content:", this.videos);
      const tabId = await this.getCurrentTab();
    const videoList = document.getElementById("videoList");
    const emptyState = document.getElementById("emptyState");
    const videoCount = document.getElementById("videoCount");
        throw new Error("No active tab found");
    console.log("DOM elements found:", {
      videoList: !!videoList,
      emptyState: !!emptyState, to content script for a fresh scan
      videoCount: !!videoCount,orceScan message to content script...");
    });onst response = await chrome.tabs.sendMessage(tabId, {
        action: "forceScan",
    if (!videoList) {
      console.error("❌ videoList element not found!");
      return;ponse && response.videos) {
    }   console.log(
          `✅ Force scan completed - found ${response.videos.length} videos`
    // Always update video count display
    if (videoCount) { response.videos;
      videoCount.textContent = `${this.videos.length} video${
        this.videos.length !== 1 ? "s" : ""
      } detected`;
      videoCount.style.display = this.videos.length > 0 ? "block" : "none";
    }   );
      } else {
    if (this.videos.length === 0) {ound in force scan");
      console.log("📭 No videos to render, showing empty state");
      videoList.innerHTML = "";
      if (emptyState) {us("ready", "No videos found (fresh scan)");
        emptyState.style.display = "block";
      }atch (error) {
      return;.error("❌ Force reload failed:", error);
    } this.updateStatus("error", "Force reload failed: " + error.message);

    console.log("📹 Rendering videos...");
    if (emptyState) { Falling back to storage reload...");
      emptyState.style.display = "none";();
    }
    videoList.innerHTML = "";

    // Add a simple test to verify videos array is valid
    if (!Array.isArray(this.videos)) {
      console.error(DEBUG: Checking storage contents...");
        "❌ this.videos is not an array:",
        typeof this.videos,
        this.videosage = await chrome.storage.local.get(null);
      );nsole.log("🔍 All storage contents:", allStorage);
      return;
    } if (this.currentTabId) {
        const storageKey = `videos_${this.currentTabId}`;
    this.videos.forEach((video, index) => {y];
      console.log(`Creating video item ${index + 1}:`, video);:`, videos);

      // Validate video objectength > 0) {
      if (!video || typeof video !== "object") { load these videos...");
        console.error(`❌ Invalid video object at index ${index}:`, video);
        return;renderVideos();
      } }
      }
      try { (error) {
        const videoItem = this.createVideoItem(video, index);
        if (videoItem) {
          videoList.appendChild(videoItem);
          console.log(
            `✅ Video item ${index + 1} created and appended successfully`
          );log("🎬 Videos updated received:", data);
        } else {
          console.error(his.currentTabId) {
            `❌ Video item ${index + 1} creation returned null/undefined`
          );enderVideos();
        }
      } catch (error) {ge =
        console.error(`❌ Error creating video item ${index + 1}:`, error);
        console.error("Video data that caused error:", video);
        console.error("Error stack:", error.stack);
      }
    });his.updateStatus("ready", statusMessage);
      this.showScanningIndicator(false);
    // Final verification
    const renderedItems = videoList.querySelectorAll(".video-item");deos`);
    console.log(
      `✅ renderVideos completed. Expected: ${this.videos.length}, Rendered: ${renderedItems.length}`
    );  `⏭️ Ignoring videos update for different tab: ${data.tabId} (current: ${this.currentTabId})`
      );
    if (renderedItems.length !== this.videos.length) {
      console.warn("⚠️ Mismatch between expected and rendered video count!");
      console.log("DOM children in videoList:", videoList.children.length);
      console.log("VideoList innerHTML length:", videoList.innerHTML.length);
    }onsole.log(`🎬 Starting renderVideos with ${this.videos.length} videos`);
    console.log("🔍 Videos array content:", this.videos);
    // Force a UI refresh
    videoList.style.display = "none";mentById("videoList");
    setTimeout(() => { document.getElementById("emptyState");
      videoList.style.display = "flex";entById("videoCount");
    }, 10);
  } console.log("DOM elements found:", {
      videoList: !!videoList,
  createVideoItem(video, index) {
    console.log(`🔧 Creating video item ${index}:`, video);
    });
    // Validate input
    if (!video || typeof video !== "object") {
      console.error(`❌ Invalid video object for item ${index}:`, video);
      return null;
    }

    try {ways update video count display
      const item = document.createElement("div");
      item.className = "video-item";is.videos.length} video${
      item.dataset.videoIndex = index; : ""
      } detected`;
      // Generate thumbnail or placeholderos.length > 0 ? "block" : "none";
      const previewHtml = video.poster
        ? `<img src="${video.poster}" alt="Video thumbnail">`
        : `<div class="placeholder">🎥</div>`;
      console.log("📭 No videos to render, showing empty state");
      // Determine video quality/resolution - with safe fallbacks
      const resolution = this.extractResolution(video) || "Unknown";
      const fileSize = this.formatFileSize(video.size);
      const duration = this.formatDuration(video.duration);
      return;
      // Generate quality options - with error handling
      let qualityOptions;
      try {.log("📹 Rendering videos...");
        qualityOptions = this.generateQualityOptions(video);
      } catch (error) {display = "none";
        console.warn(
          `⚠️ Error generating quality options for video ${index}:`,
          error
        ); a simple test to verify videos array is valid
        qualityOptions = [s.videos)) {
          {le.error(
            url: video.url || "#",rray:",
            label: "Default Quality",
          },.videos
        ];
      }eturn;
    }
      // Build the HTML with safe values
      const title = video.title || `Video ${index + 1}`;
      const videoUrl = video.url || "#";{index + 1}:`, video);

      item.innerHTML = `object
        <div class="video-preview">= "object") {
          ${previewHtml} Invalid video object at index ${index}:`, video);
          <div class="play-overlay">▶</div>
        </div>
        <div class="video-info">
          <div class="video-title">${title}</div>
          <div class="video-meta">ateVideoItem(video, index);
            ${deoItem) {
              resolution && resolution !== "Unknown"
                ? `<span class="resolution">${resolution}</span>`
                : "" item ${index + 1} created and appended successfully`
            }
            ${fileSize ? `<span class="size">${fileSize}</span>` : ""}
            ${duration ? `<span class="duration">${duration}</span>` : ""}
          </div>ideo item ${index + 1} creation returned null/undefined`
          <div class="video-actions">
            ${
              qualityOptions.length > 1
                ? `or(`❌ Error creating video item ${index + 1}:`, error);
              <select class="quality-select" data-video-index="${index}">
                ${qualityOptionsck:", error.stack);
                  .map(
                    (option) =>
                      `<option value="${option.url}">${option.label}</option>`
                  )cation
                  .join("")}deoList.querySelectorAll(".video-item");
              </select>
            `erVideos completed. Expected: ${this.videos.length}, Rendered: ${renderedItems.length}`
                : ""
            }
            <button class="download-btn" data-video-index="${index}" data-video-url="${videoUrl}">
              📥 Downloadsmatch between expected and rendered video count!");
            </button>M children in videoList:", videoList.children.length);
          </div>g("VideoList innerHTML length:", videoList.innerHTML.length);
          <div class="progress-container" id="progress-${index}">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>e.display = "none";
            <div class="progress-text">0%</div>
          </div>style.display = "flex";
        </div>
      `;

      // Bind download button event with error handling
      try {.log(`🔧 Creating video item ${index}:`, video);
        const downloadBtn = item.querySelector(".download-btn");
        if (downloadBtn) {
          downloadBtn.addEventListener("click", (e) => {
            this.handleDownload(video, index, e.target);ndex}:`, video);
          });null;
        }

        // Bind quality selector change
        const qualitySelect = item.querySelector(".quality-select");
        if (qualitySelect) {o-item";
          qualitySelect.addEventListener("change", (e) => {
            const downloadBtn = item.querySelector(".download-btn");
            if (downloadBtn) { placeholder
              downloadBtn.dataset.videoUrl = e.target.value;
            }mg src="${video.poster}" alt="Video thumbnail">`
          });iv class="placeholder">🎥</div>`;
        }
      } catch (error) {o quality/resolution - with safe fallbacks
        console.error( = this.extractResolution(video) || "Unknown";
          `❌ Error binding events for video item ${index}:`,
          erroration = this.formatDuration(video.duration);
        );
      }/ Generate quality options - with error handling
      let qualityOptions;
      console.log(`✅ Successfully created video item ${index}`);
      return item;ions = this.generateQualityOptions(video);
    } catch (error) { {
      console.error(`❌ Error in createVideoItem for index ${index}:`, error);
      console.error("Error stack:", error.stack);r video ${index}:`,
          error
      // Return a minimal fallback item
      const fallbackItem = document.createElement("div");
      fallbackItem.className = "video-item";
      fallbackItem.innerHTML = `",
        <div class="video-info">ity",
          <div class="video-title">Video ${index + 1} (Error loading)</div>
          <div class="video-meta">
            <span class="resolution">Error</span>
          </div>
        </div> the HTML with safe values
      `;nst title = video.title || `Video ${index + 1}`;
      return fallbackItem;eo.url || "#";
    }
  }   item.innerHTML = `
        <div class="video-preview">
  // Add these utility functions near the top of the file, after any initial declarations
  sanitizeFilename(filename) {rlay">▶</div>
    // Remove invalid characters and spaces
    return filename"video-info">
      .replace(/[<>:"/\\|?*]/g, "_"){title}</div>
      .replace(/\s+/g, "_")-meta">
      .substring(0, 100); // Limit length
  }           resolution && resolution !== "Unknown"
                ? `<span class="resolution">${resolution}</span>`
  getExtensionFromUrl(url) {
    if (!url) return ".mp4";
            ${fileSize ? `<span class="size">${fileSize}</span>` : ""}
    // For blob URLs, default to .mp4="duration">${duration}</span>` : ""}
    if (url.startsWith("blob:")) {
      return ".mp4";="video-actions">
    }       ${
              qualityOptions.length > 1
    try {       ? `
      const urlObj = new URL(url);ty-select" data-video-index="${index}">
      const pathname = urlObj.pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (match) {  (option) =>
        const ext = match[1].toLowerCase();ion.url}">${option.label}</option>`
        if (["mp4", "webm", "mkv", "avi", "mov", "flv"].includes(ext)) {
          return "." + ext;}
        }     </select>
      }     `
    } catch (e) { ""
      console.debug("Could not parse URL for extension:", e);
    }       <button class="download-btn" data-video-index="${index}" data-video-url="${videoUrl}">
              📥 Download
    return ".mp4";on>
  }       </div>
          <div class="progress-container" id="progress-${index}">
  showNotification(message, type = "info") {
    // Create notification element-fill"></div>
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
        </div>
    // Style the notification
    notification.style.cssText = `
      position: fixed; button event with error handling
      top: 20px;
      right: 20px;loadBtn = item.querySelector(".download-btn");
      padding: 12px 20px;{
      border-radius: 4px;EventListener("click", (e) => {
      font-size: 14px;eDownload(video, index, e.target);
      z-index: 10000;
      transition: opacity 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;ctor change
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);ctor(".quality-select");
    `;  if (qualitySelect) {
          qualitySelect.addEventListener("change", (e) => {
    // Set colors based on type item.querySelector(".download-btn");
    switch (type) {nloadBtn) {
      case "success":dBtn.dataset.videoUrl = e.target.value;
        notification.style.backgroundColor = "#4CAF50";
        notification.style.color = "white";
        break;
      case "error":r) {
        notification.style.backgroundColor = "#f44336";
        notification.style.color = "white"; item ${index}:`,
        break;r
      case "warning":
        notification.style.backgroundColor = "#ff9800";
        notification.style.color = "white";
        break;log(`✅ Successfully created video item ${index}`);
      default:tem;
        notification.style.backgroundColor = "#2196F3";
        notification.style.color = "white";Item for index ${index}:`, error);
    } console.error("Error stack:", error.stack);

    document.body.appendChild(notification);
      const fallbackItem = document.createElement("div");
    // Remove notification after 3 seconds";
    setTimeout(() => {erHTML = `
      notification.style.opacity = "0";
      setTimeout(() => {deo-title">Video ${index + 1} (Error loading)</div>
        if (notification.parentNode) {
          notification.remove();ion">Error</span>
        } </div>
      }, 300);
    }, 3000);
  }   return fallbackItem;
    }
  async handleDownload(video) {
    try {
      console.log('Starting download for video:', video);
          try {
      // Get the active tab download for video:", video);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      ve tab
      if (!tab) {rome.tabs.query({
        throw new Error('No active tab found');ctive: true,
      }        currentWindow: true,
      
      // Generate filename using the utility functions defined above
      const filename = sanitizeFilename(video.title || 'video') + getExtensionFromUrl(video.url);f (!tab) {
              throw new Error("No active tab found");
      // Send download request to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'downloadVideo',
        url: video.url,
        filename: filename        sanitizeFilename(video.title || "video") +
      });
      
      ifo content script instead of background script
}
