#!/usr/bin/env node

// Health check script for Video Downloader Extension
const fs = require("fs");
const path = require("path");

console.log("🎬 Video Downloader Extension - Health Check");
console.log("===========================================\n");

const checks = [
  {
    name: "Manifest V3 Compliance",
    check: () => {
      const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
      return manifest.manifest_version === 3;
    },
  },
  {
    name: "All Core Files Present",
    check: () => {
      const requiredFiles = [
        "manifest.json",
        "background.js",
        "content.js",
        "popup.html",
        "popup.js",
      ];
      return requiredFiles.every((file) => fs.existsSync(file));
    },
  },
  {
    name: "Icons Directory",
    check: () => {
      return fs.existsSync("icons") && fs.lstatSync("icons").isDirectory();
    },
  },
  {
    name: "PNG Icons Available",
    check: () => {
      const requiredIcons = [
        "icon16.png",
        "icon32.png",
        "icon48.png",
        "icon128.png",
      ];
      return requiredIcons.every((icon) =>
        fs.existsSync(path.join("icons", icon))
      );
    },
  },
  {
    name: "Background Script Syntax",
    check: () => {
      const background = fs.readFileSync("background.js", "utf8");
      // Check for common issues
      return (
        !background.includes("window.") && background.includes("chrome.runtime")
      );
    },
  },
  {
    name: "Content Script Structure",
    check: () => {
      const content = fs.readFileSync("content.js", "utf8");
      return (
        content.includes("VideoDownloaderContent") &&
        content.includes("chrome.runtime.onMessage")
      );
    },
  },
  {
    name: "Popup Script Structure",
    check: () => {
      const popup = fs.readFileSync("popup.js", "utf8");
      return (
        popup.includes("VideoDownloaderPopup") &&
        popup.includes("chrome.tabs.query")
      );
    },
  },
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} (Error: ${error.message})`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All checks passed! Extension is ready for testing.");
  console.log("\n📖 Next steps:");
  console.log("1. Load the extension in Chrome (chrome://extensions/)");
  console.log("2. Test on various websites");
  console.log("3. Use tests/test-page.html for controlled testing");
} else {
  console.log("⚠️  Some issues found. Please review the failed checks above.");
  process.exit(1);
}
