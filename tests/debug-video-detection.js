// Video Detection Debugging Script
// This script helps debug why videos are not being detected

console.log("🔍 Starting video detection debugging...");

class VideoDetectionDebugger {
    constructor() {
        this.debugResults = {};
        this.init();
    }

    init() {
        console.log("📋 Initializing Video Detection Debugger");
        this.runAllTests();
    }

    async runAllTests() {
        try {
            console.log("\n🧪 Running comprehensive video detection tests...");
            
            // Test 1: Check content script loading
            await this.testContentScriptLoading();
            
            // Test 2: Check DOM video elements
            await this.testDOMVideoElements();
            
            // Test 3: Check extension communication
            await this.testExtensionCommunication();
            
            // Test 4: Check storage
            await this.testStorage();
            
            // Test 5: Check web request monitoring
            await this.testWebRequestMonitoring();
            
            // Test 6: Manual scan test
            await this.testManualScan();
            
            console.log("\n📊 Debug Summary:");
            console.table(this.debugResults);
            
            this.generateReport();
            
        } catch (error) {
            console.error("❌ Debug test failed:", error);
        }
    }

    async testContentScriptLoading() {
        console.log("\n1. 🔄 Testing Content Script Loading...");
        
        try {
            // Check if content script class is available
            const hasClass = typeof VideoDownloaderContent !== 'undefined';
            const hasInstance = !!window.videoDownloaderContent;
            
            this.debugResults['Content Script Class'] = hasClass ? '✅ Available' : '❌ Missing';
            this.debugResults['Content Script Instance'] = hasInstance ? '✅ Available' : '❌ Missing';
            
            console.log(`Content Script Class: ${hasClass ? '✅' : '❌'}`);
            console.log(`Content Script Instance: ${hasInstance ? '✅' : '❌'}`);
            
            if (hasInstance) {
                console.log("📝 Content script instance properties:");
                console.log(`- Videos array length: ${window.videoDownloaderContent.videos?.length || 0}`);
                console.log(`- Observers count: ${window.videoDownloaderContent.observers?.length || 0}`);
            }
            
        } catch (error) {
            this.debugResults['Content Script Loading'] = '❌ Error: ' + error.message;
            console.error("❌ Content script loading test failed:", error);
        }
    }

    async testDOMVideoElements() {
        console.log("\n2. 🎥 Testing DOM Video Elements...");
        
        try {
            const videos = document.querySelectorAll('video');
            const iframes = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
            
            this.debugResults['HTML5 Videos'] = `${videos.length} found`;
            this.debugResults['Video Iframes'] = `${iframes.length} found`;
            
            console.log(`HTML5 videos found: ${videos.length}`);
            console.log(`Video iframes found: ${iframes.length}`);
            
            videos.forEach((video, index) => {
                console.log(`Video ${index + 1}:`, {
                    src: video.src || 'none',
                    currentSrc: video.currentSrc || 'none',
                    sources: video.querySelectorAll('source').length,
                    readyState: video.readyState,
                    networkState: video.networkState
                });
            });
            
        } catch (error) {
            this.debugResults['DOM Video Elements'] = '❌ Error: ' + error.message;
            console.error("❌ DOM video elements test failed:", error);
        }
    }

    async testExtensionCommunication() {
        console.log("\n3. 📡 Testing Extension Communication...");
        
        try {
            // Check if Chrome extension API is available
            const hasChromeAPI = typeof chrome !== 'undefined' && !!chrome.runtime;
            this.debugResults['Chrome API'] = hasChromeAPI ? '✅ Available' : '❌ Missing';
            
            if (!hasChromeAPI) {
                console.log("❌ Chrome extension API not available");
                return;
            }
            
            // Test different message types
            const messages = [
                {action: 'scanVideos'},
                {action: 'getPageInfo'},
                {action: 'getCurrentTabId'}
            ];
            
            for (const message of messages) {
                try {
                    const response = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage(message, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    
                    this.debugResults[`Message ${message.action}`] = '✅ Success';
                    console.log(`✅ ${message.action}:`, response);
                    
                    if (message.action === 'scanVideos' && response?.videos) {
                        console.log(`📊 Scan result: ${response.videos.length} videos found`);
                        response.videos.forEach((video, index) => {
                            console.log(`  Video ${index + 1}: ${video.title} (${video.type})`);
                        });
                    }
                    
                } catch (error) {
                    this.debugResults[`Message ${message.action}`] = '❌ Error: ' + error.message;
                    console.log(`❌ ${message.action}:`, error.message);
                }
            }
            
        } catch (error) {
            this.debugResults['Extension Communication'] = '❌ Error: ' + error.message;
            console.error("❌ Extension communication test failed:", error);
        }
    }

    async testStorage() {
        console.log("\n4. 💾 Testing Storage...");
        
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Get current tab videos
                const tabId = await this.getCurrentTabId();
                const storageKey = `videos_${tabId}`;
                
                const result = await chrome.storage.local.get([storageKey]);
                const storedVideos = result[storageKey] || [];
                
                this.debugResults['Stored Videos'] = `${storedVideos.length} found`;
                console.log(`📦 Stored videos for tab ${tabId}: ${storedVideos.length}`);
                
                if (storedVideos.length > 0) {
                    console.log("📋 Stored video details:");
                    storedVideos.forEach((video, index) => {
                        console.log(`  ${index + 1}. ${video.title} (${video.type}) - ${video.url}`);
                    });
                }
                
                // Test detected videos from background
                const detectedKey = `detected_videos_${tabId}`;
                const detectedResult = await chrome.storage.local.get([detectedKey]);
                const detectedVideos = detectedResult[detectedKey] || [];
                
                this.debugResults['Detected Videos'] = `${detectedVideos.length} found`;
                console.log(`🔍 Background detected videos: ${detectedVideos.length}`);
                
            } else {
                this.debugResults['Storage'] = '❌ Chrome storage API not available';
                console.log("❌ Chrome storage API not available");
            }
            
        } catch (error) {
            this.debugResults['Storage'] = '❌ Error: ' + error.message;
            console.error("❌ Storage test failed:", error);
        }
    }

    async testWebRequestMonitoring() {
        console.log("\n5. 🌐 Testing Web Request Monitoring...");
        
        try {
            // This is harder to test from content script, but we can check if background script is working
            console.log("📡 Web request monitoring is handled by background script");
            console.log("📝 Check browser extension console for background script logs");
            
            this.debugResults['Web Request Monitoring'] = '📋 Check background script console';
            
        } catch (error) {
            this.debugResults['Web Request Monitoring'] = '❌ Error: ' + error.message;
            console.error("❌ Web request monitoring test failed:", error);
        }
    }

    async testManualScan() {
        console.log("\n6. 🔄 Testing Manual Video Scan...");
        
        try {
            if (window.videoDownloaderContent) {
                const scanResults = await window.videoDownloaderContent.scanForVideos();
                
                this.debugResults['Manual Scan'] = `${scanResults.length} videos found`;
                console.log(`🎯 Manual scan results: ${scanResults.length} videos`);
                
                if (scanResults.length > 0) {
                    console.log("📋 Manual scan video details:");
                    scanResults.forEach((video, index) => {
                        console.log(`  ${index + 1}. ${video.title} (${video.type})`);
                        console.log(`     URL: ${video.url}`);
                        console.log(`     Size: ${video.size || 'unknown'}`);
                    });
                } else {
                    console.log("🤔 No videos found in manual scan - investigating further...");
                    
                    // Check what the individual scan methods return
                    console.log("🔍 Testing individual scan methods:");
                    
                    // Test HTML5 video scan
                    const videoElements = document.querySelectorAll('video');
                    console.log(`  - HTML5 elements: ${videoElements.length}`);
                    
                    for (let i = 0; i < videoElements.length; i++) {
                        const video = videoElements[i];
                        const videoData = window.videoDownloaderContent.extractVideoData(video, i);
                        console.log(`  - Video ${i + 1} data:`, videoData);
                        console.log(`  - Is valid URL: ${window.videoDownloaderContent.isValidVideoUrl(videoData.url)}`);
                    }
                }
                
            } else {
                this.debugResults['Manual Scan'] = '❌ Content script instance not available';
                console.log("❌ Content script instance not available for manual scan");
            }
            
        } catch (error) {
            this.debugResults['Manual Scan'] = '❌ Error: ' + error.message;
            console.error("❌ Manual scan test failed:", error);
        }
    }

    async getCurrentTabId() {
        try {
            const response = await chrome.runtime.sendMessage({action: 'getCurrentTabId'});
            return response?.tabId || Date.now() % 100000;
        } catch (error) {
            return Date.now() % 100000;
        }
    }

    generateReport() {
        console.log("\n📋 Detailed Debug Report:");
        console.log("========================");
        
        const issues = [];
        const successes = [];
        
        Object.entries(this.debugResults).forEach(([test, result]) => {
            if (result.includes('❌')) {
                issues.push(`${test}: ${result}`);
            } else if (result.includes('✅')) {
                successes.push(`${test}: ${result}`);
            } else {
                console.log(`📋 ${test}: ${result}`);
            }
        });
        
        if (issues.length > 0) {
            console.log("\n❌ Issues Found:");
            issues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        if (successes.length > 0) {
            console.log("\n✅ Working Components:");
            successes.forEach(success => console.log(`  - ${success}`));
        }
        
        console.log("\n🔧 Recommended Actions:");
        
        if (issues.some(i => i.includes('Content Script'))) {
            console.log("  1. Reload the extension in chrome://extensions/");
            console.log("  2. Check browser console for content script errors");
        }
        
        if (issues.some(i => i.includes('Chrome API'))) {
            console.log("  1. Make sure you're testing on a real website (not file://)");
            console.log("  2. Check extension permissions in manifest.json");
        }
        
        if (this.debugResults['Manual Scan']?.includes('0 videos')) {
            console.log("  1. Check isValidVideoUrl() method logic");
            console.log("  2. Verify video URL patterns and validation");
            console.log("  3. Test on different websites with various video types");
        }
        
        console.log("\n🎯 Next Steps:");
        console.log("  1. Open browser DevTools and check for console errors");
        console.log("  2. Go to chrome://extensions/ and inspect the background service worker");
        console.log("  3. Test the extension on a simple video page");
        console.log("  4. Compare with the debug test page results");
    }
}

// Auto-run debugging when script loads
const debugger = new VideoDetectionDebugger();

// Make debugger available globally for manual testing
window.videoDebugger = debugger;
