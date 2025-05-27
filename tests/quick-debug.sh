#!/bin/bash

# Quick Video Detection Test Script
echo "🎬 Video Detection Test"
echo "======================"

echo ""
echo "📁 Current directory: $(pwd)"
echo "📄 Testing files in project:"

# Check if key files exist
files=("content.js" "background.js" "manifest.json" "simple-video-test.html")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "📋 Quick syntax check..."

# Check JavaScript syntax
if command -v node >/dev/null 2>&1; then
    echo "Checking content.js syntax..."
    if node -c content.js 2>/dev/null; then
        echo "✅ content.js syntax OK"
    else
        echo "❌ content.js syntax error"
        node -c content.js
    fi

    echo "Checking background.js syntax..."
    if node -c background.js 2>/dev/null; then
        echo "✅ background.js syntax OK"
    else
        echo "❌ background.js syntax error"
        node -c background.js
    fi
else
    echo "⚠️ Node.js not available for syntax checking"
fi

echo ""
echo "🔧 Next steps:"
echo "1. Load the extension in Chrome (chrome://extensions/)"
echo "2. Enable Developer mode and 'Load unpacked'"
echo "3. Select this directory"
echo "4. Open simple-video-test.html in a Chrome tab"
echo "5. Check browser console for debug output"
echo "6. Click the extension icon to open sidepanel"

echo ""
echo "🐛 Debug checklist:"
echo "- Check Chrome's extension console (go to chrome://extensions/)"
echo "- Click 'Inspect views: service worker' for background script logs"
echo "- Check browser console on test page for content script logs"
echo "- Verify videos load correctly in the test page"
