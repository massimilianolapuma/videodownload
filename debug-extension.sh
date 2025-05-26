#!/bin/bash

echo "🧪 Video Downloader Extension Debug Test"
echo "========================================"

# Check if manifest is valid
echo "1. Checking manifest.json..."
if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ Manifest is valid JSON')"; then
    echo "   ✅ manifest.json syntax OK"
else
    echo "   ❌ manifest.json has syntax errors"
    exit 1
fi

# Check background script syntax
echo "2. Checking background.js syntax..."
if node -c background.js; then
    echo "   ✅ background.js syntax OK"
else
    echo "   ❌ background.js has syntax errors"
    exit 1
fi

# Check content script syntax
echo "3. Checking content.js syntax..."
if node -c content.js; then
    echo "   ✅ content.js syntax OK"
else
    echo "   ❌ content.js has syntax errors"
    exit 1
fi

# Check sidepanel script syntax
echo "4. Checking sidepanel.js syntax..."
if node -c sidepanel.js; then
    echo "   ✅ sidepanel.js syntax OK"
else
    echo "   ❌ sidepanel.js has syntax errors"
    exit 1
fi

# Check if all required files exist
echo "5. Checking required files..."
required_files=("manifest.json" "background.js" "content.js" "sidepanel.js" "sidepanel.html")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
        exit 1
    fi
done

# Test the debug page
echo "6. Testing debug page..."
if [ -f "debug-test.html" ]; then
    echo "   ✅ debug-test.html exists"
    echo "   📄 You can test with: file://$(pwd)/debug-test.html"
else
    echo "   ❌ debug-test.html missing"
fi

echo ""
echo "🎉 All basic checks passed!"
echo ""
echo "Next steps for testing:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. Navigate to file://$(pwd)/debug-test.html"
echo "5. Click the extension icon and check the console"
echo ""
echo "For debugging:"
echo "- Check console in the test page (F12)"
echo "- Check extension background page console"
echo "- Use the Debug button in the side panel"
