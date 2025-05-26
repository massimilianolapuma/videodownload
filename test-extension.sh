#!/bin/bash

# Extension Test Script
# This script helps verify the extension is ready for loading

echo "🎬 Video Downloader Extension - Installation Check"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

echo "✅ manifest.json found"

# Validate manifest
if command -v node >/dev/null 2>&1; then
    MANIFEST_VERSION=$(node -pe "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).manifest_version")
    if [ "$MANIFEST_VERSION" = "3" ]; then
        echo "✅ Manifest V3 validated"
    else
        echo "❌ Invalid manifest version: $MANIFEST_VERSION"
        exit 1
    fi
else
    echo "⚠️  Node.js not found - skipping manifest validation"
fi

# Check required files
REQUIRED_FILES=("background.js" "content.js" "popup.html" "popup.js" "inject.js")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Check icons directory
if [ -d "icons" ]; then
    ICON_COUNT=$(find icons -name "*.svg" | wc -l)
    echo "✅ Icons directory found ($ICON_COUNT icons)"
else
    echo "❌ Icons directory missing"
    exit 1
fi

echo ""
echo "🚀 Extension ready for installation!"
echo ""
echo "To install in Chrome:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (top-right toggle)"
echo "3. Click 'Load unpacked' and select this directory:"
echo "   $(pwd)"
echo ""
echo "📖 See EXTENSION_INSTALL.md for detailed instructions"
