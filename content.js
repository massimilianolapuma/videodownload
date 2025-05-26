// Content script for Video Downloader extension
class VideoDownloaderContent {
  constructor() {
    this.videos = [];
    this.observers = [];
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Auto-scan when page loads
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => this.autoScanAndStore(), 1000);
      });
    } else {
      setTimeout(() => this.autoScanAndStore(), 1000);
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

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "scanVideos": {
          const videos = await this.scanForVideos();
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

    try {
      // Scan for HTML5 video elements
      await this.scanVideoElements();

      // Scan for embedded videos (YouTube, Vimeo, etc.)
      await this.scanEmbeddedVideos();

      // Scan for video sources in scripts and attributes
      await this.scanVideoSources();

      // Get detected videos from background script
      await this.getDetectedVideos();

      console.log(`Found ${this.videos.length} videos`);
      return this.videos;
    } catch (error) {
      console.error("Error scanning for videos:", error);
      return this.videos;
    }
  }

  async scanVideoElements() {
    const videoElements = document.querySelectorAll("video");

    videoElements.forEach((video, index) => {
      const videoData = this.extractVideoData(video, index);
      if (videoData.url && this.isValidVideoUrl(videoData.url)) {
        this.videos.push(videoData);
      }
    });
  }

  extractVideoData(videoElement, index) {
    const src = videoElement.src || videoElement.currentSrc;
    const poster = videoElement.poster;

    // Try to get video from source elements
    let videoSrc = src;
    if (!videoSrc) {
      const sources = videoElement.querySelectorAll("source");
      if (sources.length > 0) {
        // Prefer higher quality sources
        const sortedSources = Array.from(sources).sort((a, b) => {
          const aRes = this.extractResolution(a.media || a.type || "");
          const bRes = this.extractResolution(b.media || b.type || "");
          return bRes - aRes;
        });
        videoSrc = sortedSources[0].src;
      }
    }

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
          if (!this.videos.some((v) => v.url === detectedVideo.url)) {
            this.videos.push({
              url: detectedVideo.url,
              title: `Network Video (${detectedVideo.type})`,
              type: "network",
              quality: "Unknown",
              size: "Unknown",
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
    if (!url) return false;

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
      /^blob:/i,
      /youtube\.com/i,
      /youtu\.be/i,
      /vimeo\.com/i,
    ];

    return (
      videoPatterns.some((pattern) => pattern.test(url)) ||
      videoExtensions.some((ext) => url.toLowerCase().includes(ext))
    );
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
}

// Initialize content script when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.videoDownloaderContent = new VideoDownloaderContent();
  });
} else {
  window.videoDownloaderContent = new VideoDownloaderContent();
}
