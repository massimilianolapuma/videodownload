// Debug script to identify side panel issues
console.log("=== DEBUG SIDE PANEL LOADING ===");

// Test Chrome APIs availability
console.log("Chrome APIs test:");
console.log("- chrome.tabs available:", !!chrome.tabs);
console.log("- chrome.storage available:", !!chrome.storage);
console.log("- chrome.runtime available:", !!chrome.runtime);

// Test tab query
async function testTabQuery() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Tab query result:", tabs);
    return tabs[0]?.id;
  } catch (error) {
    console.error("Tab query error:", error);
    return null;
  }
}

// Test storage access
async function testStorageAccess(tabId) {
  try {
    const result = await chrome.storage.local.get([`videos_${tabId}`]);
    console.log("Storage access result:", result);
    return result;
  } catch (error) {
    console.error("Storage access error:", error);
    return null;
  }
}

// Test all storage contents
async function testAllStorage() {
  try {
    const allStorage = await chrome.storage.local.get(null);
    console.log("All storage contents:", allStorage);
    return allStorage;
  } catch (error) {
    console.error("All storage access error:", error);
    return null;
  }
}

// Run comprehensive test
async function runDebugTest() {
  console.log("\n=== Starting debug test ===");

  const tabId = await testTabQuery();
  console.log("Current tab ID:", tabId);

  if (tabId) {
    await testStorageAccess(tabId);
  }

  await testAllStorage();

  console.log("=== Debug test complete ===\n");
}

// Auto-run test when script loads
runDebugTest();
