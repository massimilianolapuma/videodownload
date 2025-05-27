// Video Downloader - Side Panel Script

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

  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    transition: opacity 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;

  // Set colors based on type
  switch (type) {
    case "success":
      notification.style.backgroundColor = "#4CAF50";
      notification.style.color = "white";
      break;
    case "error":
      notification.style.backgroundColor = "#f44336";
      notification.style.color = "white";
      break;
    case "warning":
      notification.style.backgroundColor = "#ff9800";
      notification.style.color = "white";
      break;
    default:
      notification.style.backgroundColor = "#2196F3";
      notification.style.color = "white";
  }

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

    // Load videos when panel opens
    await loadVideos();

    // Set up event listeners
    setupEventListeners();

    // Auto-refresh videos periodically
    setInterval(async () => {
      await loadVideos();
    }, 5000); // Refresh every 5 seconds
  } catch (error) {
    console.error("Failed to initialize side panel:", error);
    showNotification("Failed to initialize", "error");
  }
}

// Load videos function
async function loadVideos() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      console.log("No active tab found");
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
        displayVideos(response.videos);
      } else {
        console.log("No videos found in response");
        displayNoVideosMessage();
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
  const container = document.getElementById("videos-container");
  if (!container) return;

  container.innerHTML = "";

  if (videos.length === 0) {
    displayNoVideosMessage();
    return;
  }

  videos.forEach((video, index) => {
    const videoElement = createVideoElement(video, index);
    container.appendChild(videoElement);
  });
}

// Create video element
function createVideoElement(video, index) {
  const div = document.createElement("div");
  div.className = "video-item";
  div.innerHTML = `
    <div class="video-info">
      <h3>${video.title || "Video " + (index + 1)}</h3>
      <p class="video-url">${video.url}</p>
      <p class="video-details">
        ${video.quality || "Unknown quality"} • ${video.size || "Unknown size"}
      </p>
    </div>
    <button class="download-btn" data-video='${JSON.stringify(video)}'>
      Download
    </button>
  `;

  return div;
}

// Display no videos message
function displayNoVideosMessage() {
  const container = document.getElementById("videos-container");
  if (!container) return;

  container.innerHTML = `
    <div class="no-videos">
      <p>No videos detected on this page.</p>
      <button id="force-scan-btn">Force Scan</button>
    </div>
  `;
}

// Display error message with custom text
function displayErrorMessage(customMessage) {
  const container = document.getElementById("videos-container");
  if (!container) return;

  container.innerHTML = `
    <div class="error-message">
      <p>${
        customMessage ||
        "Failed to load videos. Please refresh the page and try again."
      }</p>
      <button id="retry-btn">Retry</button>
    </div>
  `;
}

// Set up event listeners
function setupEventListeners() {
  // Download button click handler
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("download-btn")) {
      const video = JSON.parse(e.target.dataset.video);
      await handleDownload(video);
    }

    if (e.target.id === "force-scan-btn") {
      await forceScan();
    }

    if (e.target.id === "retry-btn") {
      await loadVideos();
    }
  });

  // Refresh button
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await loadVideos();
    });
  }
}

// Handle download
async function handleDownload(video) {
  try {
    console.log("Starting download for video:", video);

    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new Error("No active tab found");
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
      showNotification("Download started successfully", "success");
    } else {
      throw new Error(response?.error || "Download failed");
    }
  } catch (error) {
    console.error("Download error:", error);
    showNotification(`Download failed: ${error.message}`, "error");
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
      displayVideos(response.videos);
      showNotification(`Found ${response.videos.length} videos`, "success");
    } else {
      showNotification("No videos found", "warning");
    }
  } catch (error) {
    console.error("Force scan error:", error);
    showNotification("Scan failed", "error");
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidePanel);
} else {
  initSidePanel();
}
