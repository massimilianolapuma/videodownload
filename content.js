// Content script for Video Downloader extension
console.log("🚀 Video Downloader content script loading...");
console.log(`📍 Page URL: ${window.location.href}`);
console.log(`📄 Document ready state: ${document.readyState}`);

// Ensure we don't double-initialize on the same page
if (typeof window.videoDownloaderContent !== "undefined") {
  console.log("ℹ️ VideoDownloaderContent already exists, cleaning up first...");
  // Clean up existing instance
  if (window.videoDownloaderContent.observers) {
    window.videoDownloaderContent.observers.forEach((observer) =>
      observer.disconnect()
    );
  }
  window.videoDownloaderContent = undefined;
}

console.log("✅ Defining VideoDownloaderContent class...");

class VideoDownloaderContent {
  constructor() {
    this.videos = [];
    this.observers = [];
    this.init();
  }

  init() {
    console.log("🔧 Initializing VideoDownloaderContent...");

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("📨 Received message:", request.action);
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Signal that content script is ready
    console.log("✅ Content script initialized and ready");

    // Auto-scan when page loads with multiple attempts
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.scheduleMultipleScanAttempts();
      });
    } else {
      this.scheduleMultipleScanAttempts();
    }

    // Set up mutation observer to detect dynamically loaded videos
    this.setupMutationObserver();
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "VIDEO" || node.querySelector?.("video")) {
                shouldRescan = true;
              }
            }
          });
        }
      });

      if (shouldRescan) {
        // Debounce rescanning
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => {
          this.autoScanAndStore();
        }, 2000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.push(observer);
  }

  scheduleMultipleScanAttempts() {
    // Multiple scan attempts to catch videos that load at different times
    const scanTimes = [500, 1500, 3000, 5000]; // 0.5s, 1.5s, 3s, 5s

    scanTimes.forEach((delay, index) => {
      setTimeout(async () => {
        console.log(`🔄 Auto-scan attempt ${index + 1} at ${delay}ms`);
        await this.autoScanAndStore();
      }, delay);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "ping": {
          console.log("📨 Received ping message - responding");
          sendResponse({ success: true, ready: true });
          break;
        }

        case "scanVideos": {
          console.log(
            "📨 Received scanVideos message - forcing immediate scan"
          );
          const videos = await this.scanForVideos();
          sendResponse({ videos });
          break;
        }

        case "forceScan": {
          console.log(
            "📨 Received forceScan message - clearing cache and rescanning"
          );
          this.videos = []; // Clear existing videos
          const videos = await this.scanForVideos();
          // Also store the results
          await this.storeVideosForTab(videos);
          sendResponse({ videos });
          break;
        }

        case "getPageInfo": {
          const pageInfo = this.getPageInfo();
          sendResponse({ pageInfo });
          break;
        }

        case "downloadBlob": {
          const result = await this.downloadBlobVideo(request.video);
          sendResponse(result);
          break;
        }

        case "alternativeDownload": {
          const altResult = await this.alternativeDownload(request.video);
          sendResponse(altResult);
          break;
        }

        case "downloadVideo": {
          console.log("📨 Received downloadVideo message");
          const { url, filename } = request;

          // Check if it's a blob URL
          if (url.startsWith("blob:")) {
            console.log("🔄 Processing blob URL download:", url);

            // Special handling for YouTube and similar platforms
            if (
              window.location.hostname.includes("youtube.com") ||
              window.location.hostname.includes("youtu.be")
            ) {
              console.log(
                "🎥 YouTube detected - using alternative download method"
              );
              try {
                // For YouTube, try to find alternative video sources or use different approach
                const result = await this.handleYouTubeDownload(url, filename);
                sendResponse(result);
              } catch (error) {
                console.error("❌ YouTube download failed:", error);
                sendResponse({
                  success: false,
                  error: `YouTube download not supported: ${error.message}. Please try using youtube-dl or similar tools for YouTube videos.`,
                });
              }
            } else {
              // Try blob conversion for other sites
              try {
                // Convert blob URL to base64
                const base64Data = await blobUrlToBase64(url);

                // Detect MIME type from base64 data
                let mimeType = "video/mp4"; // Default
                if (base64Data.includes("data:video/webm")) {
                  mimeType = "video/webm";
                } else if (base64Data.includes("data:video/ogg")) {
                  mimeType = "video/ogg";
                } else if (base64Data.includes("data:image/")) {
                  mimeType = base64Data.split(";")[0].split(":")[1];
                }

                console.log("✅ Detected MIME type:", mimeType);

                // Send base64 data to background script
                await chrome.runtime.sendMessage({
                  action: "downloadBlob",
                  data: base64Data,
                  filename: filename,
                  mimeType: mimeType,
                });

                sendResponse({
                  success: true,
                  message: "Blob download initiated successfully",
                });
              } catch (error) {
                console.error("❌ Failed to convert blob URL:", error);

                // Try alternative download method for blob URLs
                try {
                  console.log(
                    "🔄 Attempting alternative blob download method..."
                  );
                  const video = {
                    url,
                    title: filename.replace(/\.[^.]+$/, ""),
                  };
                  const result =
                    await window.videoDownloaderContent.handleBlobUrl(video);

                  if (result.success) {
                    sendResponse({
                      success: true,
                      message: "Alternative blob download successful",
                    });
                  } else {
                    sendResponse({
                      success: false,
                      error: `Blob conversion failed: ${error.message}. Alternative method also failed: ${result.error}`,
                    });
                  }
                } catch (altError) {
                  console.error(
                    "❌ Alternative blob download also failed:",
                    altError
                  );
                  sendResponse({
                    success: false,
                    error: `Blob download failed. Primary error: ${error.message}. Alternative error: ${altError.message}. YouTube videos may require using the extension's video detection feature instead.`,
                  });
                }
              }
            }
          } else {
            // Regular URL, pass through to background
            try {
              console.log(
                "🔄 Sending regular URL download to background:",
                url
              );
              const response = await chrome.runtime.sendMessage({
                action: "downloadVideo",
                video: { url: url, title: filename.replace(/\.[^.]+$/, "") },
              });
              sendResponse({
                success: true,
                message: "Download initiated through background script",
              });
            } catch (error) {
              console.error("Failed to send download message:", error);
              sendResponse({ success: false, error: error.message });
            }
          }
          break;
        }

        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (error) {
      console.error("Content script error:", error);
      sendResponse({ error: error.message });
    }
  }

  async scanForVideos() {
    this.videos = [];
    console.log("🚀 Starting comprehensive video scan...");
    console.log(`📍 Current page: ${window.location.href}`);
    console.log(`📄 Page title: ${document.title}`);

    try {
      // Scan for HTML5 video elements
      console.log("\n1️⃣ Scanning for HTML5 video elements...");
      await this.scanVideoElements();
      console.log(`✅ HTML5 scan complete: ${this.videos.length} videos found`);

      // Scan for embedded videos (YouTube, Vimeo, etc.)
      console.log("\n2️⃣ Scanning for embedded videos...");
      const beforeEmbedded = this.videos.length;
      await this.scanEmbeddedVideos();
      console.log(
        `✅ Embedded scan complete: ${
          this.videos.length - beforeEmbedded
        } new videos found`
      );

      // Scan for video sources in scripts and attributes
      console.log("\n3️⃣ Scanning for video sources in scripts...");
      const beforeScripts = this.videos.length;
      await this.scanVideoSources();
      console.log(
        `✅ Script scan complete: ${
          this.videos.length - beforeScripts
        } new videos found`
      );

      // Get detected videos from background script
      console.log("\n4️⃣ Getting detected videos from background...");
      const beforeBackground = this.videos.length;
      await this.getDetectedVideos();
      console.log(
        `✅ Background scan complete: ${
          this.videos.length - beforeBackground
        } new videos found`
      );

      console.log(`\n🎯 FINAL SCAN RESULTS:`);
      console.log(`   Total videos found: ${this.videos.length}`);

      if (this.videos.length > 0) {
        console.log(`📋 Video summary:`);
        this.videos.forEach((video, index) => {
          console.log(`   ${index + 1}. "${video.title}" (${video.type})`);
          console.log(`      URL: ${video.url}`);
          console.log(`      Size: ${video.size || "unknown"}`);
        });
      } else {
        console.log(`⚠️ No videos detected. This might indicate:`);
        console.log(`   - Videos haven't loaded yet`);
        console.log(`   - URL validation is too strict`);
        console.log(`   - Video sources are not recognized`);
        console.log(`   - Page uses dynamic loading`);
      }

      return this.videos;
    } catch (error) {
      console.error("❌ Error scanning for videos:", error);
      return this.videos;
    }
  }

  async scanVideoElements() {
    const videoElements = document.querySelectorAll("video");
    console.log(`Found ${videoElements.length} video elements in DOM`);

    videoElements.forEach((video, index) => {
      console.log(`Processing video element ${index + 1}:`, {
        src: video.src,
        currentSrc: video.currentSrc,
        poster: video.poster,
        tagName: video.tagName,
      });

      const videoData = this.extractVideoData(video, index);
      console.log(
        `📊 Extracted video data for element ${index + 1}:`,
        videoData
      );

      if (videoData.url && this.isValidVideoUrl(videoData.url)) {
        this.videos.push(videoData);
        console.log(
          `✅ Added video ${index + 1} to collection - Total: ${
            this.videos.length
          }`
        );
      } else {
        console.log(`❌ Rejected video ${index + 1}:`);
        console.log(`   - Has URL: ${!!videoData.url}`);
        console.log(`   - URL: ${videoData.url || "none"}`);
        console.log(
          `   - Is valid: ${
            videoData.url ? this.isValidVideoUrl(videoData.url) : "N/A"
          }`
        );
      }
    });
  }

  extractVideoData(videoElement, index) {
    const src = videoElement.src || videoElement.currentSrc;
    const poster = videoElement.poster;

    console.log(`🔍 Extracting video data for element ${index + 1}:`, {
      src: src,
      currentSrc: videoElement.currentSrc,
      readyState: videoElement.readyState,
      networkState: videoElement.networkState,
    });

    // Try to get video from source elements
    let videoSrc = src;
    if (!videoSrc) {
      const sources = videoElement.querySelectorAll("source");
      console.log(`📋 Found ${sources.length} source elements`);
      if (sources.length > 0) {
        // Log all sources
        sources.forEach((source, sourceIndex) => {
          console.log(
            `  Source ${sourceIndex + 1}: ${source.src} (type: ${
              source.type || "none"
            })`
          );
        });

        // Try to find the best source
        // First, prefer MP4 sources
        let bestSource = Array.from(sources).find(
          (s) => s.type && s.type.includes("mp4") && s.src
        );

        // If no MP4, try WebM
        if (!bestSource) {
          bestSource = Array.from(sources).find(
            (s) => s.type && s.type.includes("webm") && s.src
          );
        }

        // If no specific type, take the first one with a source
        if (!bestSource) {
          bestSource = Array.from(sources).find((s) => s.src);
        }

        // Fallback to first source
        if (!bestSource && sources.length > 0) {
          bestSource = sources[0];
        }

        if (bestSource) {
          videoSrc = bestSource.src;
          console.log(
            `🎯 Selected source: ${videoSrc} (type: ${
              bestSource.type || "unknown"
            })`
          );
        }
      }
    }

    // Additional fallback: check for video URLs in data attributes
    if (!videoSrc) {
      const dataAttrs = ["data-src", "data-video", "data-url", "data-source"];
      for (const attr of dataAttrs) {
        const attrValue = videoElement.getAttribute(attr);
        if (attrValue) {
          console.log(`🔍 Found video URL in ${attr}: ${attrValue}`);
          videoSrc = attrValue;
          break;
        }
      }
    }

    console.log(`📍 Raw video source: ${videoSrc}`);
    const resolvedUrl = this.resolveUrl(videoSrc);
    console.log(`🔗 Resolved URL: ${resolvedUrl}`);
    const isValid = this.isValidVideoUrl(resolvedUrl);
    console.log(`✅ URL validation result: ${isValid}`);

    // Try to determine video title
    let title =
      videoElement.title ||
      videoElement.getAttribute("aria-label") ||
      videoElement.getAttribute("data-title");

    if (!title) {
      // Look for nearby text that might be the title
      const parent = videoElement.closest(
        "[data-title], [title], .video-title, .title"
      );
      if (parent) {
        title =
          parent.getAttribute("data-title") ||
          parent.getAttribute("title") ||
          parent.textContent.trim();
      }
    }

    if (!title) {
      title = document.title || `Video ${index + 1}`;
    }

    return {
      url: this.resolveUrl(videoSrc),
      title: this.cleanTitle(title),
      poster: poster ? this.resolveUrl(poster) : null,
      duration: videoElement.duration || null,
      width: videoElement.videoWidth || videoElement.width || null,
      height: videoElement.videoHeight || videoElement.height || null,
      quality: this.guessQuality(videoElement),
      size: this.estimateSize(videoElement),
      type: "html5",
      element: videoElement,
    };
  }

  async scanEmbeddedVideos() {
    // YouTube videos
    const youtubeIframes = document.querySelectorAll(
      'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
    );
    youtubeIframes.forEach((iframe, index) => {
      const src = iframe.src;
      const videoId = this.extractYouTubeId(src);
      if (videoId) {
        this.videos.push({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: `YouTube Video ${index + 1}`,
          type: "youtube",
          quality: "Various",
          size: "Unknown",
          videoId: videoId,
        });
      }
    });

    // Vimeo videos
    const vimeoIframes = document.querySelectorAll('iframe[src*="vimeo.com"]');
    vimeoIframes.forEach((iframe, index) => {
      const src = iframe.src;
      const videoId = this.extractVimeoId(src);
      if (videoId) {
        this.videos.push({
          url: `https://vimeo.com/${videoId}`,
          title: `Vimeo Video ${index + 1}`,
          type: "vimeo",
          quality: "Various",
          size: "Unknown",
          videoId: videoId,
        });
      }
    });
  }

  async scanVideoSources() {
    // Look for video URLs in scripts
    const scripts = document.querySelectorAll("script");
    const videoUrlPatterns = [
      /["']([^"']*\.mp4[^"']*)["']/gi,
      /["']([^"']*\.webm[^"']*)["']/gi,
      /["']([^"']*\.mkv[^"']*)["']/gi,
      /["']([^"']*\.avi[^"']*)["']/gi,
      /["']([^"']*\.mov[^"']*)["']/gi,
      /["']([^"']*\.flv[^"']*)["']/gi,
      /["'](blob:[^"']*)["']/gi,
    ];

    scripts.forEach((script) => {
      const content = script.textContent || script.innerHTML;

      videoUrlPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const url = match[1];
          if (
            this.isValidVideoUrl(url) &&
            !this.videos.some((v) => v.url === url)
          ) {
            this.videos.push({
              url: this.resolveUrl(url),
              title: `Detected Video (Script)`,
              type: "detected",
              quality: "Unknown",
              size: "Unknown",
            });
          }
        }
      });
    });

    // Look for data attributes that might contain video URLs
    const elementsWithData = document.querySelectorAll(
      "[data-src], [data-video], [data-mp4], [data-webm]"
    );
    elementsWithData.forEach((element) => {
      const attributes = ["data-src", "data-video", "data-mp4", "data-webm"];
      attributes.forEach((attr) => {
        const url = element.getAttribute(attr);
        if (
          url &&
          this.isValidVideoUrl(url) &&
          !this.videos.some((v) => v.url === url)
        ) {
          this.videos.push({
            url: this.resolveUrl(url),
            title: `Detected Video (Data)`,
            type: "detected",
            quality: "Unknown",
            size: "Unknown",
          });
        }
      });
    });
  }

  async getDetectedVideos() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getDetectedVideos",
      });
      if (response?.videos) {
        response.videos.forEach((detectedVideo) => {
          // Only add network videos that have meaningful metadata or are likely valid
          const hasValidMetadata =
            (detectedVideo.quality && detectedVideo.quality !== "Unknown") ||
            (detectedVideo.size && detectedVideo.size !== "Unknown") ||
            detectedVideo.duration ||
            detectedVideo.width ||
            detectedVideo.height ||
            (detectedVideo.type &&
              !detectedVideo.type.includes("xmlhttprequest"));

          if (
            !this.videos.some((v) => v.url === detectedVideo.url) &&
            hasValidMetadata
          ) {
            this.videos.push({
              url: detectedVideo.url,
              title: `Network Video (${detectedVideo.type})`,
              type: "network",
              quality: detectedVideo.quality || "Unknown",
              size: detectedVideo.size || "Unknown",
              timestamp: detectedVideo.timestamp,
            });
          }
        });
      }
    } catch (error) {
      console.error("Error getting detected videos:", error);
    }
  }

  extractYouTubeId(url) {
    const match = url.match(
      /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/
    );
    return match ? match[1] : null;
  }

  extractVimeoId(url) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  extractResolution(text) {
    const match = text.match(/(\d+)p/);
    return match ? parseInt(match[1]) : 0;
  }

  guessQuality(videoElement) {
    const height = videoElement.videoHeight || videoElement.height;

    if (height >= 2160) return "4K";
    if (height >= 1440) return "1440p";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    if (height >= 360) return "360p";
    if (height >= 240) return "240p";

    return "Unknown";
  }

  estimateSize(videoElement) {
    const duration = videoElement.duration;
    const width = videoElement.videoWidth || videoElement.width;
    const height = videoElement.videoHeight || videoElement.height;

    if (!duration || !width || !height) return "Unknown";

    // Rough estimation based on resolution and duration
    const pixels = width * height;

    // Determine bitrate based on resolution
    let bitrate;
    if (pixels > 2073600) {
      bitrate = 8000; // 4K
    } else if (pixels > 921600) {
      bitrate = 5000; // 1080p
    } else if (pixels > 518400) {
      bitrate = 3000; // 720p
    } else if (pixels > 307200) {
      bitrate = 1500; // 480p
    } else {
      bitrate = 800; // Lower quality
    }

    const sizeInMB = (bitrate * duration) / 8 / 1024; // Convert to MB

    if (sizeInMB > 1024) {
      return `~${(sizeInMB / 1024).toFixed(1)} GB`;
    } else {
      return `~${sizeInMB.toFixed(0)} MB`;
    }
  }

  isValidVideoUrl(url) {
    console.log(`🔍 Validating video URL: ${url}`);

    if (!url) {
      console.log(`❌ URL validation failed: URL is empty or null`);
      return false;
    }

    // Convert to string and clean
    const urlStr = String(url).toLowerCase().trim();

    // Very basic checks first
    if (urlStr.length < 4) {
      console.log(`❌ URL validation failed: URL too short`);
      return false;
    }

    // Skip data URLs and invalid protocols (but allow blob, http, https)
    if (urlStr.startsWith("data:") || urlStr.startsWith("javascript:")) {
      console.log(`❌ URL validation failed: Invalid protocol`);
      return false;
    }

    const videoExtensions = [
      ".mp4",
      ".webm",
      ".mkv",
      ".avi",
      ".mov",
      ".flv",
      ".m4v",
      ".3gp",
      ".ogv",
      ".ogg",
      ".wmv",
      ".divx",
      ".xvid",
      ".ts",
      ".m2ts",
    ];

    const videoPatterns = [
      /\.mp4(\?|$|#)/i,
      /\.webm(\?|$|#)/i,
      /\.mkv(\?|$|#)/i,
      /\.avi(\?|$|#)/i,
      /\.mov(\?|$|#)/i,
      /\.flv(\?|$|#)/i,
      /\.m4v(\?|$|#)/i,
      /\.3gp(\?|$|#)/i,
      /\.ogv(\?|$|#)/i,
      /\.ogg(\?|$|#)/i,
      /\.wmv(\?|$|#)/i,
      /\.ts(\?|$|#)/i,
      /\.m2ts(\?|$|#)/i,
      /^blob:/i,
      /^http[s]?:\/\/.+\.(mp4|webm|mkv|avi|mov|flv|m4v|3gp|ogv|ogg|wmv)/i,
      /youtube\.com/i,
      /youtu\.be/i,
      /vimeo\.com/i,
      /dailymotion\.com/i,
      /twitch\.tv/i,
      /googlevideo\.com/i,
      /cloudfront\.net.*\.(mp4|webm)/i,
      /amazonaws\.com.*\.(mp4|webm)/i,
      /googleapis\.com.*\.(mp4|webm)/i,
      /storage\.googleapis\.com/i,
      /commondatastorage\.googleapis\.com/i,
      /manifest.*\.(m3u8|mpd)/i,
      /\.m3u8(\?|$|#)/i,
      /\.mpd(\?|$|#)/i,
    ];

    // Test patterns first (more specific)
    for (let i = 0; i < videoPatterns.length; i++) {
      if (videoPatterns[i].test(urlStr)) {
        console.log(
          `✅ URL validation passed: matches pattern ${videoPatterns[i]}`
        );
        return true;
      }
    }

    // Test extensions (broader check)
    for (let i = 0; i < videoExtensions.length; i++) {
      if (urlStr.includes(videoExtensions[i])) {
        console.log(
          `✅ URL validation passed: contains extension ${videoExtensions[i]}`
        );
        return true;
      }
    }

    // Additional heuristic checks for video URLs
    const videoKeywords = ["video", "stream", "media", "watch", "play"];
    const hasVideoKeyword = videoKeywords.some((keyword) =>
      urlStr.includes(keyword)
    );

    if (
      hasVideoKeyword &&
      (urlStr.startsWith("http") || urlStr.startsWith("blob:"))
    ) {
      console.log(
        `✅ URL validation passed: contains video keyword and valid protocol`
      );
      return true;
    }

    // If it looks like a valid URL and doesn't have obvious non-video indicators, accept it
    if (
      (urlStr.startsWith("http") || urlStr.startsWith("blob:")) &&
      urlStr.includes("/")
    ) {
      // Exclude obvious non-video files
      const nonVideoPatterns = [
        /\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|json|xml|txt|pdf|doc)(\?|$|#)/i,
        /\.(html|htm|php|asp|jsp)(\?|$|#)/i,
      ];

      const isNonVideo = nonVideoPatterns.some((pattern) =>
        pattern.test(urlStr)
      );
      if (!isNonVideo) {
        console.log(
          `✅ URL validation passed: looks like a valid media URL with no exclusion patterns`
        );
        return true;
      }
    }

    console.log(`❌ URL validation failed: no matching patterns found`);
    console.log(`📋 URL tested: ${urlStr}`);

    return false;
  }

  resolveUrl(url) {
    if (!url) return url;

    try {
      return new URL(url, window.location.href).href;
    } catch (error) {
      console.debug("URL resolution failed:", error.message);
      return url;
    }
  }

  cleanTitle(title) {
    if (!title) return "Unknown Video";

    return title.replace(/\s+/g, " ").trim().substring(0, 100);
  }

  getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
    };
  }

  async downloadBlobVideo(video) {
    try {
      // For blob URLs, we need to fetch the blob and convert it to a downloadable format
      if (video.url.startsWith("blob:")) {
        return await this.handleBlobUrl(video);
      }

      // For other protected URLs, try to fetch and download
      return await this.fetchAndDownload(video);
    } catch (error) {
      console.error("Blob download error:", error);
      return { success: false, error: error.message };
    }
  }

  async handleBlobUrl(video) {
    try {
      console.log("Attempting to download blob URL:", video.url);

      // For blob URLs, try to fetch and create a proper download
      const response = await fetch(video.url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log("Fetched blob:", blob.type, blob.size);

      // Create object URL and download directly
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = this.generateFilename(video);
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error("Blob handling error:", error);

      // Try alternative method - direct blob download via video element
      try {
        return await this.downloadFromVideoElement(video);
      } catch (altError) {
        console.error("Alternative blob download failed:", altError);
        return {
          success: false,
          error: `${error.message}. Alternative method also failed: ${altError.message}`,
        };
      }
    }
  }

  async fetchAndDownload(video) {
    try {
      console.log("Attempting fetch download for:", video.url);

      // For regular URLs, try to fetch with proper headers
      const response = await fetch(video.url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "video/*,*/*;q=0.9",
          "User-Agent": navigator.userAgent,
          Referer: window.location.href,
        },
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      console.log("Response received:", {
        type: contentType,
        size: contentLength,
        status: response.status,
      });

      const blob = await response.blob();

      // Create object URL and download
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = this.generateFilename(video);
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      return { success: true };
    } catch (error) {
      console.error("Fetch and download error:", error);
      return { success: false, error: error.message };
    }
  }

  async alternativeDownload(video) {
    try {
      console.log("Attempting alternative download for:", video.url);

      // Method 1: Try video element extraction for blob URLs
      if (video.isBlob || video.url.startsWith("blob:")) {
        const elementResult = await this.tryVideoElementExtraction(video);
        if (elementResult.success) {
          return elementResult;
        }
      }

      // Method 2: Try background script download
      const backgroundResult = await this.tryBackgroundDownload(video);
      if (backgroundResult.success) {
        return backgroundResult;
      }

      // Method 3: Try direct fetch as last resort
      return await this.fetchAndDownload(video);
    } catch (error) {
      console.error("All alternative download methods failed:", error);
      return { success: false, error: error.message };
    }
  }

  async tryVideoElementExtraction(video) {
    const videoElements = document.querySelectorAll("video");

    for (const videoEl of videoElements) {
      const src = videoEl.currentSrc || videoEl.src;
      if (this.isMatchingVideoElement(videoEl, video, src)) {
        const extractionResult = await this.extractFromVideoElement(
          videoEl,
          video
        );
        if (extractionResult.success) {
          return extractionResult;
        }
      }
    }

    return { success: false, error: "No matching video element found" };
  }

  isMatchingVideoElement(videoEl, video, src) {
    return src === video.url || (video.element && videoEl === video.element);
  }

  async extractFromVideoElement(videoEl, video) {
    // Check if we can access video frames
    if (this.isVideoElementReady(videoEl)) {
      try {
        return await this.downloadFromVideoStream(videoEl, video);
      } catch (streamError) {
        console.log("Stream capture failed:", streamError);
      }
    }

    // Try canvas-based capture for very short videos
    if (this.isShortVideo(videoEl)) {
      try {
        return await this.downloadFromVideoCanvas(videoEl, video);
      } catch (canvasError) {
        console.log("Canvas capture failed:", canvasError);
      }
    }

    return { success: false, error: "Video element extraction failed" };
  }

  isVideoElementReady(videoEl) {
    return (
      videoEl.readyState >= 2 &&
      videoEl.videoWidth > 0 &&
      videoEl.videoHeight > 0
    );
  }

  isShortVideo(videoEl) {
    // Only consider very short videos (under 30 seconds) for canvas capture
    // Longer videos should use stream recording for full capture
    return videoEl.duration && videoEl.duration < 30;
  }

  async tryBackgroundDownload(video) {
    try {
      console.log("Trying background script download");
      const result = await chrome.runtime.sendMessage({
        action: "downloadVideo",
        video: video,
      });

      if (result?.success) {
        return { success: true };
      } else {
        throw new Error(result?.error || "Background download failed");
      }
    } catch (bgError) {
      console.log("Background download failed:", bgError);
      return { success: false, error: bgError.message };
    }
  }

  async downloadFromVideoElement(video) {
    try {
      const videoElements = document.querySelectorAll("video");
      const matchingElement = this.findMatchingVideoElement(
        videoElements,
        video
      );

      if (!matchingElement) {
        throw new Error("Could not find matching video element");
      }

      // Try to find alternative source
      const alternativeSource = this.findAlternativeSource(matchingElement);
      if (alternativeSource) {
        console.log("Found non-blob source:", alternativeSource);
        return await this.fetchAndDownload({
          ...video,
          url: alternativeSource,
        });
      }

      // Try canvas capture for short videos
      if (this.canUseCanvasCapture(matchingElement)) {
        return await this.downloadFromVideoCanvas(matchingElement, video);
      }

      throw new Error("Could not find alternative source");
    } catch (error) {
      console.error("Video element download error:", error);
      return { success: false, error: error.message };
    }
  }

  findMatchingVideoElement(videoElements, video) {
    for (const videoEl of videoElements) {
      const src = videoEl.currentSrc || videoEl.src;
      if (src === video.url || (video.element && videoEl === video.element)) {
        return videoEl;
      }
    }
    return null;
  }

  findAlternativeSource(videoElement) {
    const sources = videoElement.querySelectorAll("source");
    for (const source of sources) {
      if (
        source.src &&
        !source.src.startsWith("blob:") &&
        this.isValidVideoUrl(source.src)
      ) {
        return source.src;
      }
    }
    return null;
  }

  canUseCanvasCapture(videoElement) {
    // Canvas capture should only be used for very short videos or as a last resort
    // since it only captures a single frame, not the full video
    return videoElement.duration && videoElement.duration < 10;
  }

  async downloadFromVideoStream(videoElement, video) {
    try {
      console.log("Attempting stream capture");

      if (!videoElement.captureStream) {
        throw new Error("Stream capture not supported on this video element");
      }

      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder API not supported in this browser");
      }

      const stream = videoElement.captureStream();

      if (!stream || stream.getTracks().length === 0) {
        throw new Error("Failed to capture video stream - no tracks available");
      }

      // Check if the stream has video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video tracks found in captured stream");
      }

      console.log(`Captured stream with ${videoTracks.length} video track(s)`);

      // Enhanced recording with progress tracking
      return this.recordVideoStream(stream, videoElement, video);
    } catch (error) {
      console.error("Stream capture error:", error);
      throw error;
    }
  }

  async recordVideoStream(stream, videoElement, video) {
    // Try different MIME types for better compatibility
    let mediaRecorder;
    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`Using MIME type: ${mimeType}`);
        try {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 2500000, // 2.5 Mbps for better quality
            audioBitsPerSecond: 128000, // 128 kbps audio
          });
          break;
        } catch (error) {
          console.log(
            `Failed to create MediaRecorder with ${mimeType}:`,
            error
          );
          continue;
        }
      }
    }

    if (!mediaRecorder) {
      // Fallback to default with optimized settings
      console.log("Using default MediaRecorder settings");
      try {
        mediaRecorder = new MediaRecorder(stream, {
          videoBitsPerSecond: 2500000,
          audioBitsPerSecond: 128000,
        });
      } catch (error) {
        console.log("Falling back to basic MediaRecorder:", error.message);
        mediaRecorder = new MediaRecorder(stream);
      }
    }

    const chunks = [];
    let totalBytes = 0;

    return new Promise((resolve, reject) => {
      let recordingStartTime = Date.now();
      let progressInterval;
      let lastProgressUpdate = Date.now();

      // Enhanced progress tracking
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          totalBytes += event.data.size;

          const elapsed = Math.round((Date.now() - recordingStartTime) / 1000);
          const now = Date.now();

          // Update progress every 2 seconds or on significant chunk size
          if (now - lastProgressUpdate >= 2000 || event.data.size > 1000000) {
            const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
            console.log(
              `Recording progress: ${elapsed}s, total: ${totalMB}MB, chunk: ${(
                event.data.size / 1024
              ).toFixed(0)}KB`
            );
            lastProgressUpdate = now;

            // Notify background script of progress for side panel
            chrome.runtime
              .sendMessage({
                action: "streamRecordingProgress",
                data: {
                  elapsed: elapsed,
                  totalBytes: totalBytes,
                  chunkSize: event.data.size,
                  url: video.url,
                },
              })
              .catch(() => {
                // Ignore if no listeners
              });
          }
        }
      };

      mediaRecorder.onstart = () => {
        console.log("Recording started - enhanced stream capture");

        // Update progress every 3 seconds
        progressInterval = setInterval(() => {
          const elapsed = Math.round((Date.now() - recordingStartTime) / 1000);
          const totalDuration = videoElement.duration
            ? Math.round(videoElement.duration)
            : "?";
          const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
          console.log(
            `Recording in progress: ${elapsed}s / ${totalDuration}s (${totalMB}MB captured)`
          );
        }, 3000);
      };

      mediaRecorder.onstop = () => {
        clearInterval(progressInterval);
        const finalDuration = Math.round(
          (Date.now() - recordingStartTime) / 1000
        );
        const finalMB = (totalBytes / 1024 / 1024).toFixed(1);
        console.log(
          `Recording completed: ${finalDuration}s total, ${finalMB}MB, ${chunks.length} chunks`
        );

        // Stop all stream tracks to free up resources
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });

        if (chunks.length === 0) {
          reject(new Error("No video data captured"));
          return;
        }

        // Create download with proper MIME type
        const recordedMimeType = mediaRecorder.mimeType || "video/webm";
        const blob = new Blob(chunks, { type: recordedMimeType });
        console.log(
          `Created blob: ${(blob.size / 1024 / 1024).toFixed(1)}MB, type: ${
            blob.type
          }`
        );

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;

        // Generate filename with proper extension
        const extension = recordedMimeType.includes("mp4") ? "mp4" : "webm";
        link.download = this.generateFilename({
          ...video,
          title: video.title + "_captured",
        }).replace(/\.[^.]+$/, `.${extension}`);

        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        resolve({
          success: true,
          finalSize: blob.size,
          duration: finalDuration,
        });
      };

      mediaRecorder.onerror = (error) => {
        clearInterval(progressInterval);
        const elapsed = Math.round((Date.now() - recordingStartTime) / 1000);
        console.error(`Recording failed after ${elapsed}s:`, error);

        // Stop all stream tracks on error
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        reject(
          new Error(
            `Stream recording failed after ${elapsed}s: ${error.message}`
          )
        );
      };

      // Enhanced recording strategy
      this.startEnhancedRecording(mediaRecorder, videoElement, stream);

      // Set up cleanup and monitoring
      this.setupRecordingMonitoring(
        mediaRecorder,
        videoElement,
        stream,
        recordingStartTime,
        reject
      );
    });
  }

  startEnhancedRecording(mediaRecorder, videoElement, stream) {
    // Request data chunks more frequently for large videos to prevent memory issues
    const videoDuration = videoElement.duration || 300;
    let chunkInterval;

    if (videoDuration > 60) {
      // For long videos, request chunks every 1 second to prevent memory buildup
      chunkInterval = 1000;
    } else if (videoDuration > 30) {
      // For medium videos, request chunks every 2 seconds
      chunkInterval = 2000;
    } else {
      // For short videos, request chunks every 3 seconds
      chunkInterval = 3000;
    }

    console.log(
      `Starting recording with ${chunkInterval}ms chunk interval for ${videoDuration}s video`
    );
    mediaRecorder.start(chunkInterval);
  }

  setupRecordingMonitoring(
    mediaRecorder,
    videoElement,
    stream,
    startTime,
    reject
  ) {
    // Set up various stop conditions
    const duration = videoElement.duration || 300;

    // Stop recording when video ends
    const videoEndHandler = () => {
      if (mediaRecorder.state === "recording") {
        console.log("Stopping recording - video ended");
        mediaRecorder.stop();
      }
    };
    videoElement.addEventListener("ended", videoEndHandler, { once: true });

    // Stop recording after maximum duration (10 minutes max for safety, but allow full video length)
    const maxRecordDuration = Math.min(duration * 1000, 600000); // Max 10 minutes
    const timeoutId = setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        console.log(
          `Stopping recording due to timeout (${maxRecordDuration / 1000}s)`
        );
        mediaRecorder.stop();
      }
    }, maxRecordDuration);

    // Monitor for stream track ending
    stream.getTracks().forEach((track) => {
      track.addEventListener(
        "ended",
        () => {
          if (mediaRecorder.state === "recording") {
            console.log("Stopping recording - stream track ended");
            mediaRecorder.stop();
          }
        },
        { once: true }
      );
    });

    // Monitor for page visibility changes to handle focus/unfocus
    const visibilityHandler = () => {
      if (document.hidden && mediaRecorder.state === "recording") {
        console.log("Page hidden - continuing recording in background");
        // Don't stop recording when page is hidden, just log it
        // The download will continue even if the extension popup is closed
      } else if (!document.hidden && mediaRecorder.state === "recording") {
        console.log("Page visible - recording continues");
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeoutId);
      videoElement.removeEventListener("ended", videoEndHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };

    // Ensure cleanup happens when recording stops
    const originalStop = mediaRecorder.onstop;
    mediaRecorder.onstop = (event) => {
      cleanup();
      if (originalStop) originalStop.call(mediaRecorder, event);
    };

    const originalError = mediaRecorder.onerror;
    mediaRecorder.onerror = (event) => {
      cleanup();
      if (originalError) originalError.call(mediaRecorder, event);
    };
  }

  async downloadFromVideoCanvas(videoElement, video) {
    try {
      console.log("Attempting canvas capture (static frame)");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
      canvas.height =
        videoElement.videoHeight || videoElement.clientHeight || 480;

      // Draw current frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to blob and download
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas to blob conversion failed"));
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = this.generateFilename({
            ...video,
            title: video.title + "_frame.png",
          });
          link.style.display = "none";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          resolve({ success: true });
        }, "image/png");
      });
    } catch (error) {
      console.error("Canvas capture error:", error);
      throw error;
    }
  }

  generateFilename(video) {
    let filename = video.title || "video";

    // Clean filename
    filename = filename.replace(/[<>:"/\\|?*]/g, "_");
    filename = filename.substring(0, 100);

    // Add timestamp to avoid conflicts
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");

    // Determine extension
    let extension = "mp4"; // Default

    if (video.url) {
      try {
        const url = new URL(video.url);
        const path = url.pathname;
        const urlExtension = path.split(".").pop().toLowerCase();
        if (
          ["mp4", "webm", "mkv", "avi", "mov", "flv"].includes(urlExtension)
        ) {
          extension = urlExtension;
        }
      } catch (error) {
        // URL parsing failed, use default extension
        console.debug(
          "Could not parse video URL for extension:",
          error.message
        );
      }
    }

    return `${filename}_${timestamp}.${extension}`;
  }

  async autoScanAndStore() {
    try {
      // Perform the video scan
      const videos = await this.scanForVideos();

      // Store the videos for the current tab
      if (videos && videos.length > 0) {
        const tabId = await this.getCurrentTabId();
        await chrome.storage.local.set({ [`videos_${tabId}`]: videos });

        // Notify background script about found videos
        chrome.runtime
          .sendMessage({
            action: "videosDetected",
            tabId: tabId,
            count: videos.length,
          })
          .catch((err) => {
            // Ignore errors if popup/background isn't ready
            console.log("Background script not ready:", err.message);
          });

        console.log(`Auto-detected and stored ${videos.length} videos`);
      }

      return videos;
    } catch (error) {
      console.error("Error in auto scan and store:", error);
      return [];
    }
  }

  async getCurrentTabId() {
    // Get current tab ID through background script
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCurrentTabId",
      });
      return response?.tabId || 0;
    } catch (error) {
      // Fallback: extract from URL or use timestamp when background script unavailable
      console.log(
        "Background script unavailable, using fallback tab ID:",
        error.message
      );
      return Date.now() % 100000;
    }
  }

  async storeVideosForTab(videos) {
    try {
      const tabId = await this.getCurrentTabId();
      await chrome.storage.local.set({ [`videos_${tabId}`]: videos });
      console.log(`💾 Stored ${videos.length} videos for tab ${tabId}`);
    } catch (error) {
      console.error("❌ Failed to store videos:", error);
    }
  }

  // YouTube-specific download handler
  async handleYouTubeDownload(blobUrl, filename) {
    console.log("🎥 Handling YouTube download request");

    // For YouTube, blob URLs are typically not accessible due to security restrictions
    // Instead, we should inform the user about the limitation and suggest alternatives
    return {
      success: false,
      error:
        "YouTube videos cannot be downloaded directly due to platform restrictions. Please use dedicated YouTube download tools like youtube-dl, yt-dlp, or online YouTube downloaders.",
    };
  }
}

// Enhanced function to convert blob URL to base64 with fallback handling
async function blobUrlToBase64(blobUrl) {
  console.log("🔄 Attempting to convert blob URL to base64:", blobUrl);

  try {
    // Method 1: Direct fetch (works for same-origin blob URLs)
    const response = await fetch(blobUrl, {
      method: "GET",
      cache: "no-cache",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const blob = await response.blob();
    console.log(
      "✅ Successfully fetched blob:",
      blob.type,
      `${(blob.size / 1024 / 1024).toFixed(2)}MB`
    );

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("✅ Successfully converted blob to base64");
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error("❌ FileReader error:", error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("❌ Primary blob conversion failed:", error);

    // Check if this is a security/CORS error (common with YouTube and similar sites)
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("CORS") ||
      error.message.includes("Network error")
    ) {
      // For security-restricted blob URLs, try alternative methods
      console.log(
        "🔒 Security restriction detected, trying alternative methods..."
      );

      // Method 2: Try using XMLHttpRequest for cross-origin requests
      try {
        console.log("🔄 Trying XMLHttpRequest fallback...");
        return await blobUrlToBase64WithXHR(blobUrl);
      } catch (xhrError) {
        console.error("❌ XMLHttpRequest fallback failed:", xhrError);

        // Method 3: Try finding the corresponding video element and extracting from it
        try {
          console.log("🔄 Trying video element extraction fallback...");
          return await extractBlobFromVideoElement(blobUrl);
        } catch (videoError) {
          console.error("❌ Video element fallback failed:", videoError);

          // If we're on YouTube or similar platforms, provide specific guidance
          if (
            ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com", "dailymotion.com", "www.dailymotion.com"].includes(window.location.hostname)
          ) {
            throw new Error(
              `Video download blocked by platform security restrictions. This is common on ${window.location.hostname}. Please use dedicated download tools for this platform.`
            );
          }

          throw new Error(
            `All blob conversion methods failed. Primary: ${error.message}, XHR: ${xhrError.message}, Video: ${videoError.message}`
          );
        }
      }
    } else {
      // For other types of errors, continue with original fallback logic

      // Method 2: Try using XMLHttpRequest for cross-origin requests
      try {
        console.log("🔄 Trying XMLHttpRequest fallback...");
        return await blobUrlToBase64WithXHR(blobUrl);
      } catch (xhrError) {
        console.error("❌ XMLHttpRequest fallback failed:", xhrError);

        // Method 3: Try finding the corresponding video element and extracting from it
        try {
          console.log("🔄 Trying video element extraction fallback...");
          return await extractBlobFromVideoElement(blobUrl);
        } catch (videoError) {
          console.error("❌ Video element fallback failed:", videoError);
          throw new Error(
            `All blob conversion methods failed. Primary: ${error.message}, XHR: ${xhrError.message}, Video: ${videoError.message}`
          );
        }
      }
    }
  }
}

// Fallback method using XMLHttpRequest
async function blobUrlToBase64WithXHR(blobUrl) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", blobUrl, true);
    xhr.responseType = "blob";

    xhr.onload = function () {
      if (xhr.status === 200) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      } else {
        reject(new Error(`XHR failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("XHR network error"));
    xhr.ontimeout = () => reject(new Error("XHR timeout"));
    xhr.timeout = 30000; // 30 second timeout

    xhr.send();
  });
}

// Fallback method to extract blob from video element
async function extractBlobFromVideoElement(blobUrl) {
  console.log("🔍 Looking for video element with blob URL:", blobUrl);

  // Find video elements that might be using this blob URL
  const videoElements = document.querySelectorAll("video");
  let targetVideo = null;

  for (const video of videoElements) {
    if (video.src === blobUrl || video.currentSrc === blobUrl) {
      targetVideo = video;
      break;
    }

    // Check source elements
    const sources = video.querySelectorAll("source");
    for (const source of sources) {
      if (source.src === blobUrl) {
        targetVideo = video;
        break;
      }
    }
    if (targetVideo) break;
  }

  if (!targetVideo) {
    throw new Error("No video element found with matching blob URL");
  }

  console.log("✅ Found matching video element, attempting canvas capture...");

  // Create canvas and capture current frame
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = targetVideo.videoWidth || targetVideo.clientWidth || 640;
  canvas.height = targetVideo.videoHeight || targetVideo.clientHeight || 480;

  try {
    ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas to blob conversion failed"));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          console.log("✅ Successfully extracted frame as base64");
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  } catch (canvasError) {
    throw new Error(`Canvas capture failed: ${canvasError.message}`);
  }
}

// Initialize content script when DOM is ready
console.log("🔄 Initializing VideoDownloaderContent...");

if (!window.videoDownloaderContent) {
  try {
    if (document.readyState === "loading") {
      console.log("📄 Document still loading, waiting for DOMContentLoaded...");
      document.addEventListener("DOMContentLoaded", () => {
        if (!window.videoDownloaderContent) {
          console.log("✅ DOM ready, creating VideoDownloaderContent instance");
          window.videoDownloaderContent = new VideoDownloaderContent();
          console.log("🎉 VideoDownloaderContent initialized successfully");
        }
      });
    } else {
      console.log(
        "✅ DOM already ready, creating VideoDownloaderContent instance"
      );
      window.videoDownloaderContent = new VideoDownloaderContent();
      console.log("🎉 VideoDownloaderContent initialized successfully");
    }
  } catch (error) {
    console.error("❌ Failed to initialize VideoDownloaderContent:", error);
  }
} else {
  console.log(
    "ℹ️ VideoDownloaderContent already exists, skipping initialization"
  );
}
