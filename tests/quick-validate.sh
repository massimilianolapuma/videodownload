#!/bin/bash

# Quick validation script for Video Downloader Extension
echo "🎥 Video Downloader Extension - Quick Validation"
echo "================================================"

# Check if all required files exist
echo "📁 Checking core files..."
required_files=("manifest.json" "background.js" "content.js" "sidepanel.js" "sidepanel.html" "popup.js" "popup.html")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔍 Checking key functionality..."

# Check for critical functions in background.js
if grep -q "triggerVideoScan" background.js; then
    echo "✅ Video scanning function found"
else
    echo "❌ Video scanning function missing"
fi

if grep -q "broadcastMessage" background.js; then
    echo "✅ Message broadcasting found"
else
    echo "❌ Message broadcasting missing"
fi

# Check for critical functions in sidepanel.js
if grep -q "setupMessageListener" sidepanel.js; then
    echo "✅ Message listener setup found"
else
    echo "❌ Message listener setup missing"
fi

if grep -q "handleVideosUpdated" sidepanel.js; then
    echo "✅ Video update handler found"
else
    echo "❌ Video update handler missing"
fi

# Check manifest.json structure
if grep -q "manifest_version.*3" manifest.json; then
    echo "✅ Manifest V3 format confirmed"
else
    echo "❌ Manifest V3 format issue"
fi

if grep -q "sidePanel" manifest.json; then
    echo "✅ Side panel permission found"
else
    echo "❌ Side panel permission missing"
fi

echo ""
echo "📊 File sizes:"
ls -lh *.js *.html *.json | grep -E '\.(js|html|json)$'

echo ""
echo "🚀 Ready for testing!"
echo "Next steps:"
echo "1. Load the extension in Chrome (chrome://extensions/)"
echo "2. Open quick-test.html in a browser tab"
echo "3. Test the extension functionality"

echo ""
echo "🐛 To debug:"
echo "- Open Chrome DevTools (F12)"
echo "- Check Console for any errors"
echo "- Monitor Network tab for video requests"
echo "- Use Extension Developer Tools for background script debugging"
