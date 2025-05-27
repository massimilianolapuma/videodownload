const chokidar = require("chokidar");
const { execSync } = require("child_process");
const path = require("path");

console.log("👀 Watching for file changes...\n");

// Files to watch
const filesToWatch = [
  "*.js",
  "*.html",
  "*.css",
  "manifest.json",
  "!build.js",
  "!watch.js",
  "!node_modules/**",
];

// Initialize watcher
const watcher = chokidar.watch(filesToWatch, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
});

// Debounce function to prevent multiple builds
let buildTimeout;
function debouncedBuild() {
  clearTimeout(buildTimeout);
  buildTimeout = setTimeout(() => {
    console.log("🔨 Building...");
    try {
      execSync("npm run build", { stdio: "inherit" });
      console.log("✅ Build completed!\n");
    } catch (error) {
      console.error("❌ Build failed:", error.message);
    }
  }, 500);
}

// Watch events
watcher
  .on("change", (filePath) => {
    console.log(`📝 File changed: ${path.basename(filePath)}`);
    debouncedBuild();
  })
  .on("add", (filePath) => {
    console.log(`➕ File added: ${path.basename(filePath)}`);
    debouncedBuild();
  })
  .on("unlink", (filePath) => {
    console.log(`🗑️  File removed: ${path.basename(filePath)}`);
    debouncedBuild();
  });

console.log("Press Ctrl+C to stop watching.\n");
