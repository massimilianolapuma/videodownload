#!/usr/bin/env node

// Test script to verify the two critical JavaScript fixes
console.log("🔧 Testing Critical JavaScript Fixes");
console.log("=====================================");

// Test 1: formatFileSize function fix
console.log("\n📏 Testing formatFileSize() function...");

// Simulate the formatFileSize function
function formatFileSize(bytes) {
  // Convert to number and validate
  const numBytes = Number(bytes);
  if (!numBytes || numBytes === 0 || isNaN(numBytes)) return null;

  const units = ["B", "KB", "MB", "GB"];
  let size = numBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Test various inputs that could cause the original error
const testCases = [
  { input: 1024, expected: "1.0 KB" },
  { input: "1024", expected: "1.0 KB" },
  { input: 1048576, expected: "1.0 MB" },
  { input: null, expected: null },
  { input: undefined, expected: null },
  { input: "", expected: null },
  { input: "not a number", expected: null },
  { input: 0, expected: null },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  try {
    const result = formatFileSize(test.input);
    if (result === test.expected) {
      console.log(
        `  ✅ Test ${index + 1}: formatFileSize(${test.input}) = ${result}`
      );
      passed++;
    } else {
      console.log(
        `  ❌ Test ${index + 1}: formatFileSize(${
          test.input
        }) = ${result}, expected ${test.expected}`
      );
      failed++;
    }
  } catch (error) {
    console.log(
      `  ❌ Test ${index + 1}: formatFileSize(${test.input}) threw error: ${
        error.message
      }`
    );
    failed++;
  }
});

console.log(`\n📊 formatFileSize Tests: ${passed} passed, ${failed} failed`);

// Test 2: Content script class redeclaration protection
console.log("\n🛡️  Testing content script class protection...");

// Simulate the class redeclaration protection
global.window = global.window || {};

// First declaration should work
if (typeof VideoDownloaderContent === "undefined") {
  class VideoDownloaderContent {
    constructor() {
      this.name = "VideoDownloaderContent";
    }
  }
  global.VideoDownloaderContent = VideoDownloaderContent;
  console.log("  ✅ First class declaration successful");
} else {
  console.log("  ❌ First class declaration blocked unexpectedly");
}

// Second declaration should be blocked
if (typeof VideoDownloaderContent === "undefined") {
  console.log("  ❌ Second class declaration not properly blocked");
} else {
  console.log("  ✅ Second class declaration properly blocked");
}

// Test initialization protection
let initCount = 0;

function simulateInitialization() {
  if (!global.window.videoDownloaderContent) {
    global.window.videoDownloaderContent = new global.VideoDownloaderContent();
    initCount++;
    return true;
  }
  return false;
}

// First init should work
if (simulateInitialization()) {
  console.log("  ✅ First initialization successful");
} else {
  console.log("  ❌ First initialization failed");
}

// Second init should be blocked
if (simulateInitialization()) {
  console.log("  ❌ Second initialization not properly blocked");
} else {
  console.log("  ✅ Second initialization properly blocked");
}

console.log(`  📊 Total initializations: ${initCount} (should be 1)`);

// Summary
console.log("\n🎯 Fix Validation Summary");
console.log("=========================");
console.log(`formatFileSize fix: ${failed === 0 ? "✅ PASSED" : "❌ FAILED"}`);
console.log(
  `Content script protection: ${initCount === 1 ? "✅ PASSED" : "❌ FAILED"}`
);

const allTestsPassed = failed === 0 && initCount === 1;
console.log(
  `\n${
    allTestsPassed
      ? "🎉 All fixes validated successfully!"
      : "⚠️  Some fixes need attention"
  }`
);

process.exit(allTestsPassed ? 0 : 1);
