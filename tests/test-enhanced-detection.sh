#!/bin/zsh

# Video Detection Test Script for macOS/zsh
echo "🎬 Video Detection Enhanced Test"
echo "================================"

cd "$(dirname "$0")"

echo ""
echo "📍 Current directory: $(pwd)"
echo "📅 Date: $(date)"

echo ""
echo "🔍 Checking updated files..."

# Check if our key files were updated
files_to_check=("content.js" "sidepanel.js" "simple-video-test.html")
for file in "${files_to_check[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
        echo "   Last modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file")"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "📋 JavaScript syntax validation..."

# Check syntax with node if available
if command -v node >/dev/null 2>&1; then
    echo "Checking content.js..."
    if node -c content.js 2>/dev/null; then
        echo "✅ content.js syntax OK"
    else
        echo "❌ content.js has syntax errors:"
        node -c content.js
    fi

    echo "Checking sidepanel.js..."
    if node -c sidepanel.js 2>/dev/null; then
        echo "✅ sidepanel.js syntax OK"
    else
        echo "❌ sidepanel.js has syntax errors:"
        node -c sidepanel.js
    fi
else
    echo "⚠️ Node.js not found - skipping syntax check"
fi

echo ""
echo "📊 Enhanced Features Added:"
echo "✨ Improved URL validation with more patterns"
echo "🔄 Multiple scan attempts at different intervals"
echo "🎯 Better source element selection (MP4 > WebM > fallback)"
echo "📨 Force scan message for fresh detection"
echo "🔍 Enhanced debug panel with live testing"
echo "📋 Data attribute fallback detection"
echo "⏱️ Timing improvements for dynamic content"

echo ""
echo "🔧 Testing Instructions:"
echo "========================"
echo "1. Load extension in Chrome:"
echo "   - Go to chrome://extensions/"
echo "   - Enable Developer mode"
echo "   - Click 'Load unpacked'"
echo "   - Select this directory"
echo ""
echo "2. Test on simple page:"
echo "   - Open simple-video-test.html in Chrome"
echo "   - Click extension icon to open sidepanel"
echo "   - Look for detected videos"
echo "   - Check browser console for debug logs"
echo ""
echo "3. Use debug features:"
echo "   - Click '🔍 Debug' button in sidepanel"
echo "   - Click '⚡ Force Reload' for fresh scan"
echo "   - Check console output for detailed logging"
echo ""
echo "4. Test on real websites:"
echo "   - Try websites with video content"
echo "   - Check if videos are now detected"
echo "   - Compare with other working extensions"

echo ""
echo "🐛 Debug Checklist:"
echo "==================="
echo "□ Extension loads without errors"
echo "□ Sidepanel opens when icon clicked"
echo "□ Console shows video detection logs"
echo "□ Debug panel shows detailed information"
echo "□ Force reload triggers fresh scan"
echo "□ Videos appear in sidepanel list"
echo "□ URL validation accepts test video URLs"

echo ""
echo "📝 Key Changes Made:"
echo "==================="
echo "• Enhanced isValidVideoUrl() with 25+ patterns"
echo "• Added multiple scan attempts (0.5s, 1.5s, 3s, 5s)"
echo "• Improved source element selection logic"
echo "• Added forceScan message type"
echo "• Enhanced debug panel with live testing"
echo "• Better error logging and troubleshooting"
echo "• Added data attribute fallback detection"

echo ""
echo "🚀 Ready for testing!"
