// Injected script for Video Downloader extension
// This script runs in the page context to access page variables and functions

(function () {
  "use strict";

  class VideoDownloaderInject {
    constructor() {
      this.detectedVideos = new Set();
      this.init();
    }

    init() {
      // Hook into video creation and modification
      this.hookVideoElements();

      // Hook into common video player libraries
      this.hookVideoPlayers();

      // Monitor network requests
      this.hookNetworkRequests();

      // Listen for messages from content script
      window.addEventListener("message", (event) => {
        if (event.source !== window) return;

        if (event.data.type && event.data.type === "VIDEO_DOWNLOADER_REQUEST") {
          this.handleRequest(event.data);
        }
      });
    }

    hookVideoElements() {
      // Hook video element creation
      const originalCreateElement = document.createElement;
      document.createElement = function (tagName) {
        const element = originalCreateElement.call(this, tagName);

        if (tagName.toLowerCase() === "video") {
          // Monitor for src changes
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (
                mutation.type === "attributes" &&
                (mutation.attributeName === "src" ||
                  mutation.attributeName === "currentsrc")
              ) {
                const video = mutation.target;
                if (video.src) {
                  window.videoDownloaderInject.reportVideo(video.src, {
                    title: video.title || document.title,
                    type: "html5-hooked",
                  });
                }
              }
            });
          });

          observer.observe(element, {
            attributes: true,
            attributeFilter: ["src", "currentsrc"],
          });
        }

        return element;
      };

      // Hook video src property
      const videoProto = HTMLVideoElement.prototype;
      const originalSrcDescriptor = Object.getOwnPropertyDescriptor(
        videoProto,
        "src"
      );

      if (originalSrcDescriptor) {
        Object.defineProperty(videoProto, "src", {
          get: originalSrcDescriptor.get,
          set: function (value) {
            if (value) {
              window.videoDownloaderInject.reportVideo(value, {
                title: this.title || document.title,
                type: "html5-property",
              });
            }
            return originalSrcDescriptor.set.call(this, value);
          },
        });
      }
    }

    hookVideoPlayers() {
      // Hook into common video players

      // YouTube Player API
      if (window.YT && window.YT.Player) {
        const originalYTPlayer = window.YT.Player;
        window.YT.Player = function (...args) {
          const player = new originalYTPlayer(...args);

          // Try to get video info
          try {
            const videoData = player.getVideoData();
            if (videoData && videoData.video_id) {
              window.videoDownloaderInject.reportVideo(
                `https://www.youtube.com/watch?v=${videoData.video_id}`,
                {
                  title: videoData.title,
                  type: "youtube-api",
                  videoId: videoData.video_id,
                }
              );
            }
          } catch (e) {
            console.debug("Could not get YouTube video data:", e);
          }

          return player;
        };
      }

      // Video.js
      if (window.videojs) {
        const originalVideoJS = window.videojs;
        window.videojs = function (...args) {
          const player = originalVideoJS(...args);

          player.on("loadstart", () => {
            const src = player.currentSrc();
            if (src) {
              window.videoDownloaderInject.reportVideo(src, {
                title: player.options_.title || document.title,
                type: "videojs",
              });
            }
          });

          return player;
        };
      }

      // JW Player
      if (window.jwplayer) {
        const originalJWPlayer = window.jwplayer;
        window.jwplayer = function (...args) {
          const player = originalJWPlayer(...args);

          if (player.on) {
            player.on("ready", () => {
              const playlist = player.getPlaylist();
              if (playlist && playlist.length > 0) {
                playlist.forEach((item) => {
                  if (item.sources) {
                    item.sources.forEach((source) => {
                      window.videoDownloaderInject.reportVideo(source.file, {
                        title: item.title || document.title,
                        type: "jwplayer",
                      });
                    });
                  }
                });
              }
            });
          }

          return player;
        };
      }
    }

    hookNetworkRequests() {
      // Hook XMLHttpRequest
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (this.isVideoUrl(url)) {
          this.addEventListener("readystatechange", () => {
            if (this.readyState === 4 && this.status === 200) {
              window.videoDownloaderInject.reportVideo(url, {
                title: "XHR Video",
                type: "xhr",
              });
            }
          });
        }

        return originalXHROpen.call(this, method, url, ...args);
      };

      // Hook fetch
      const originalFetch = window.fetch;
      window.fetch = function (input, options) {
        const url = typeof input === "string" ? input : input.url;

        if (window.videoDownloaderInject.isVideoUrl(url)) {
          return originalFetch(input, options).then((response) => {
            if (response.ok) {
              window.videoDownloaderInject.reportVideo(url, {
                title: "Fetch Video",
                type: "fetch",
              });
            }
            return response;
          });
        }

        return originalFetch(input, options);
      };
    }

    isVideoUrl(url) {
      if (!url) return false;

      const videoPatterns = [
        /\.mp4(\?|$)/i,
        /\.webm(\?|$)/i,
        /\.mkv(\?|$)/i,
        /\.avi(\?|$)/i,
        /\.mov(\?|$)/i,
        /\.flv(\?|$)/i,
        /\.m4v(\?|$)/i,
        /\.3gp(\?|$)/i,
        /blob:/i,
        /youtube\.com.*videoplayback/i,
        /googlevideo\.com/i,
        /vimeo\.com.*progressive/i,
      ];

      return videoPatterns.some((pattern) => pattern.test(url));
    }

    reportVideo(url, metadata = {}) {
      if (!url || this.detectedVideos.has(url)) return;

      this.detectedVideos.add(url);

      // Send to content script
      window.postMessage(
        {
          type: "VIDEO_DOWNLOADER_VIDEO_DETECTED",
          video: {
            url: url,
            title: metadata.title || "Detected Video",
            type: metadata.type || "detected",
            timestamp: Date.now(),
            ...metadata,
          },
        },
        "*"
      );
    }

    handleRequest(data) {
      switch (data.action) {
        case "getPageVideos":
          this.sendPageVideos();
          break;
        case "getPlayerInfo":
          this.sendPlayerInfo();
          break;
      }
    }

    sendPageVideos() {
      const videos = Array.from(this.detectedVideos).map((url) => ({
        url: url,
        title: "Detected Video",
        type: "injected",
      }));

      window.postMessage(
        {
          type: "VIDEO_DOWNLOADER_RESPONSE",
          action: "pageVideos",
          videos: videos,
        },
        "*"
      );
    }

    sendPlayerInfo() {
      const playerInfo = {
        youtube: !!window.YT,
        videojs: !!window.videojs,
        jwplayer: !!window.jwplayer,
      };

      window.postMessage(
        {
          type: "VIDEO_DOWNLOADER_RESPONSE",
          action: "playerInfo",
          info: playerInfo,
        },
        "*"
      );
    }
  }

  // Initialize the inject script
  window.videoDownloaderInject = new VideoDownloaderInject();
})();
