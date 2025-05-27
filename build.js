const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Get version increment type from command line
const incrementType = process.argv[2] || "patch"; // major, minor, or patch

// Read current manifest
const manifestPath = path.join(__dirname, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Parse current version
const currentVersion = manifest.version.split(".").map(Number);
const oldVersion = manifest.version;

// Increment version based on type
switch (incrementType) {
  case "major":
    currentVersion[0]++;
    currentVersion[1] = 0;
    currentVersion[2] = 0;
    break;
  case "minor":
    currentVersion[1]++;
    currentVersion[2] = 0;
    break;
  case "patch":
  default:
    currentVersion[2]++;
    break;
}

const newVersion = currentVersion.join(".");

// Update manifest with new version
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `✅ Version updated: ${oldVersion} -> ${newVersion} (${incrementType})`
);

// Create a build directory
const buildDir = path.join(__dirname, "build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

// Files to include in the build
const filesToCopy = [
  "manifest.json",
  "background.js",
  "content.js",
  "inject.js",
  "popup.html",
  "popup.js",
  "styles.css",
  "sidepanel.html",
  "sidepanel.js",
];

// Directories to copy
const directoriesToCopy = ["icons", "styles"];

// Copy files
filesToCopy.forEach((file) => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`📄 Copied: ${file}`);
  } else {
    console.warn(`⚠️  File not found: ${file}`);
  }
});

// Copy directories
directoriesToCopy.forEach((dir) => {
  const srcPath = path.join(__dirname, dir);
  const destPath = path.join(buildDir, dir);

  if (fs.existsSync(srcPath)) {
    copyDirectory(srcPath, destPath);
    console.log(`📁 Copied directory: ${dir}`);
  }
});

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create a zip file (optional - requires 'zip' command)
try {
  const zipName = `video-downloader-v${newVersion}.zip`;
  execSync(`cd build && zip -r ../${zipName} ./*`);
  console.log(`\n📦 Created build package: ${zipName}`);
} catch (error) {
  console.log(
    "\n💡 Tip: Install zip command to create packaged builds automatically"
  );
}

console.log(`\n✨ Build completed successfully! Version: ${newVersion}`);
console.log(`📁 Build output: ${buildDir}`);

// Create a version log
const versionLogPath = path.join(__dirname, "version-log.txt");
const timestamp = new Date().toISOString();
const logEntry = `${timestamp}: v${newVersion} - Fixed missing utility functions in sidepanel.js\n`;
fs.appendFileSync(versionLogPath, logEntry);
