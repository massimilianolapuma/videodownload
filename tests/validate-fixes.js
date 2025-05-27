#!/usr/bin/env node

/**
 * Video Downloader Extension - Validation Script
 * Automated testing for the three critical fixes
 */

const fs = require("fs");
const path = require("path");

console.log("🎬 Video Downloader Extension - Validation Script");
console.log("=================================================");

// Test 1: File Structure Validation
function validateFileStructure() {
  console.log("\n📁 Validating File Structure...");

  const requiredFiles = [
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "sidepanel.html",
    "sidepanel.js",
    "styles.css",
  ];

  let passed = 0;
  let failed = 0;

  requiredFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
      passed++;
    } else {
      console.log(`  ❌ ${file}`);
      failed++;
    }
  });

  return { passed, failed };
}

// Test 2: Manifest V3 Compliance
function validateManifest() {
  console.log("\n📋 Validating Manifest V3 Compliance...");

  try {
    const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
    let passed = 0;
    let failed = 0;

    // Check manifest version
    if (manifest.manifest_version === 3) {
      console.log("  ✅ Manifest V3");
      passed++;
    } else {
      console.log("  ❌ Not Manifest V3");
      failed++;
    }

    // Check side panel permission
    if (manifest.permissions && manifest.permissions.includes("sidePanel")) {
      console.log("  ✅ sidePanel permission");
      passed++;
    } else {
      console.log("  ❌ Missing sidePanel permission");
      failed++;
    }

    // Check side panel configuration
    if (manifest.side_panel) {
      console.log("  ✅ side_panel configuration");
      passed++;
    } else {
      console.log("  ❌ Missing side_panel configuration");
      failed++;
    }

    // Check service worker
    if (manifest.background && manifest.background.service_worker) {
      console.log("  ✅ Service worker configured");
      passed++;
    } else {
      console.log("  ❌ Service worker not configured");
      failed++;
    }

    return { passed, failed };
  } catch (error) {
    console.log("  ❌ Invalid manifest.json");
    return { passed: 0, failed: 1 };
  }
}

// Test 3: Code Quality Checks
function validateCodeQuality() {
  console.log("\n🔍 Validating Code Quality...");

  let passed = 0;
  let failed = 0;

  // Check background.js for key features
  try {
    const backgroundCode = fs.readFileSync("background.js", "utf8");

    if (
      backgroundCode.includes("activeDownloads") &&
      backgroundCode.includes("downloadProgress")
    ) {
      console.log("  ✅ Download state management");
      passed++;
    } else {
      console.log("  ❌ Missing download state management");
      failed++;
    }

    if (backgroundCode.includes("setupSidePanel")) {
      console.log("  ✅ Side panel integration");
      passed++;
    } else {
      console.log("  ❌ Missing side panel integration");
      failed++;
    }

    if (backgroundCode.includes("broadcastMessage")) {
      console.log("  ✅ Message broadcasting");
      passed++;
    } else {
      console.log("  ❌ Missing message broadcasting");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Cannot read background.js");
    failed++;
  }

  // Check content.js for enhanced recording
  try {
    const contentCode = fs.readFileSync("content.js", "utf8");

    if (
      contentCode.includes("recordVideoStream") &&
      contentCode.includes("startEnhancedRecording")
    ) {
      console.log("  ✅ Enhanced stream recording");
      passed++;
    } else {
      console.log("  ❌ Missing enhanced stream recording");
      failed++;
    }

    if (contentCode.includes("setupRecordingMonitoring")) {
      console.log("  ✅ Recording monitoring");
      passed++;
    } else {
      console.log("  ❌ Missing recording monitoring");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Cannot read content.js");
    failed++;
  }

  // Check sidepanel.js
  try {
    const sidepanelCode = fs.readFileSync("sidepanel.js", "utf8");

    if (
      sidepanelCode.includes("VideoDownloaderSidePanel") &&
      sidepanelCode.includes("updateDownloadItem")
    ) {
      console.log("  ✅ Side panel functionality");
      passed++;
    } else {
      console.log("  ❌ Missing side panel functionality");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Cannot read sidepanel.js");
    failed++;
  }

  return { passed, failed };
}

// Test 4: Critical Fix Validation
function validateCriticalFixes() {
  console.log("\n🔧 Validating Critical Fixes...");

  let passed = 0;
  let failed = 0;

  // Fix #1: Enhanced stream recording for large files
  try {
    const contentCode = fs.readFileSync("content.js", "utf8");

    if (
      contentCode.includes("videoBitsPerSecond: 2500000") &&
      contentCode.includes("audioBitsPerSecond: 128000")
    ) {
      console.log("  ✅ Fix #1: Enhanced recording bitrates");
      passed++;
    } else {
      console.log("  ❌ Fix #1: Missing enhanced bitrates");
      failed++;
    }

    if (
      contentCode.includes("streamRecordingProgress") &&
      contentCode.includes("progressInterval")
    ) {
      console.log("  ✅ Fix #1: Progress tracking for large files");
      passed++;
    } else {
      console.log("  ❌ Fix #1: Missing progress tracking");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Fix #1: Cannot validate");
    failed++;
  }

  // Fix #2: Persistent state management
  try {
    const backgroundCode = fs.readFileSync("background.js", "utf8");

    if (
      backgroundCode.includes("restoreActiveDownloads") &&
      backgroundCode.includes("chrome.storage.local")
    ) {
      console.log("  ✅ Fix #2: Persistent state management");
      passed++;
    } else {
      console.log("  ❌ Fix #2: Missing state persistence");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Fix #2: Cannot validate");
    failed++;
  }

  // Fix #3: Side panel implementation
  try {
    const sidepanelExists =
      fs.existsSync("sidepanel.html") && fs.existsSync("sidepanel.js");
    const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

    if (sidepanelExists && manifest.side_panel) {
      console.log("  ✅ Fix #3: Side panel implementation");
      passed++;
    } else {
      console.log("  ❌ Fix #3: Incomplete side panel");
      failed++;
    }
  } catch (error) {
    console.log("  ❌ Fix #3: Cannot validate");
    failed++;
  }

  return { passed, failed };
}

// Test 5: Extension Package Validation
function validatePackaging() {
  console.log("\n📦 Validating Extension Package...");

  let passed = 0;
  let failed = 0;

  // Check if icons exist
  if (fs.existsSync("icons") && fs.readdirSync("icons").length > 0) {
    console.log("  ✅ Icons directory");
    passed++;
  } else {
    console.log("  ❌ Missing icons");
    failed++;
  }

  // Check if package script exists
  if (fs.existsSync("package-extension.sh")) {
    console.log("  ✅ Package script");
    passed++;
  } else {
    console.log("  ❌ Missing package script");
    failed++;
  }

  // Check if health check exists
  if (fs.existsSync("health-check.js")) {
    console.log("  ✅ Health check script");
    passed++;
  } else {
    console.log("  ❌ Missing health check");
    failed++;
  }

  return { passed, failed };
}

// Main validation function
function runValidation() {
  const results = {
    structure: validateFileStructure(),
    manifest: validateManifest(),
    codeQuality: validateCodeQuality(),
    criticalFixes: validateCriticalFixes(),
    packaging: validatePackaging(),
  };

  console.log("\n📊 Validation Summary");
  console.log("====================");

  let totalPassed = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([category, result]) => {
    console.log(
      `${category.padEnd(15)} | ✅ ${result.passed
        .toString()
        .padStart(2)} | ❌ ${result.failed.toString().padStart(2)}`
    );
    totalPassed += result.passed;
    totalFailed += result.failed;
  });

  console.log("".padEnd(30, "-"));
  console.log(
    `${"Total".padEnd(15)} | ✅ ${totalPassed
      .toString()
      .padStart(2)} | ❌ ${totalFailed.toString().padStart(2)}`
  );

  const successRate = Math.round(
    (totalPassed / (totalPassed + totalFailed)) * 100
  );
  console.log(`\n🎯 Success Rate: ${successRate}%`);

  if (totalFailed === 0) {
    console.log("\n🎉 All validations passed! Extension is ready for testing.");
    console.log("\n📋 Next Steps:");
    console.log("1. Load extension in Chrome (chrome://extensions/)");
    console.log("2. Test on http://localhost:8080/tests/test-page.html");
    console.log("3. Follow the TESTING_GUIDE.md for comprehensive testing");
    console.log("4. Verify side panel functionality");
    console.log("5. Test large file downloads and focus/unfocus scenarios");
  } else {
    console.log(
      `\n⚠️  ${totalFailed} validation(s) failed. Please review and fix before testing.`
    );
  }

  return { totalPassed, totalFailed, successRate };
}

// Run the validation
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation };
