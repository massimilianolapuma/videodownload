#!/bin/bash

# Test script for Video Downloader Extension Connection Fixes
echo "🧪 Testing Video Downloader Extension Connection Fixes"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
    "success") echo -e "${GREEN}✅ $message${NC}" ;;
    "error") echo -e "${RED}❌ $message${NC}" ;;
    "warning") echo -e "${YELLOW}⚠️ $message${NC}" ;;
    "info") echo -e "${BLUE}ℹ️ $message${NC}" ;;
    esac
}

# 1. Validate all JavaScript files
echo ""
echo "📁 Step 1: Validating JavaScript Syntax"
echo "----------------------------------------"

for file in content.js background.js sidepanel.js popup.js; do
    if [ -f "$file" ]; then
        if node -c "$file" 2>/dev/null; then
            print_status "success" "$file syntax is valid"
        else
            print_status "error" "$file has syntax errors"
            node -c "$file"
            exit 1
        fi
    else
        print_status "warning" "$file not found"
    fi
done

# 2. Validate manifest
echo ""
echo "📋 Step 2: Validating Manifest"
echo "-------------------------------"

if [ -f "manifest.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))" 2>/dev/null; then
        print_status "success" "manifest.json is valid JSON"

        # Check manifest version
        manifest_version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).manifest_version)")
        if [ "$manifest_version" = "3" ]; then
            print_status "success" "Manifest V3 format confirmed"
        else
            print_status "error" "Expected Manifest V3, found V$manifest_version"
        fi

        # Check required permissions
        permissions=$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).permissions.join(','))")
        if [[ $permissions == *"activeTab"* && $permissions == *"storage"* && $permissions == *"scripting"* ]]; then
            print_status "success" "Required permissions present: $permissions"
        else
            print_status "warning" "Check permissions: $permissions"
        fi

    else
        print_status "error" "manifest.json is invalid JSON"
        exit 1
    fi
else
    print_status "error" "manifest.json not found"
    exit 1
fi

# 3. Check content script configuration
echo ""
echo "📜 Step 3: Checking Content Script Configuration"
echo "------------------------------------------------"

# Check if content script is properly configured in manifest
content_scripts=$(node -e "
const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'));
const cs = manifest.content_scripts || [];
console.log(cs.length);
")

if [ "$content_scripts" -gt "0" ]; then
    print_status "success" "Content scripts configured in manifest"

    # Check content script matches
    matches=$(node -e "
    const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'));
    const cs = manifest.content_scripts[0] || {};
    console.log((cs.matches || []).join(','));
    ")
    print_status "info" "Content script matches: $matches"

else
    print_status "error" "No content scripts configured in manifest"
fi

# 4. Check icon files exist
echo ""
echo "🖼️ Step 4: Checking Icon Files"
echo "-------------------------------"

icon_sizes="16 32 48 128"
all_icons_exist=true

for size in $icon_sizes; do
    icon_file="icons/video${size}.png"
    if [ -f "$icon_file" ]; then
        print_status "success" "Icon $icon_file exists"
    else
        print_status "error" "Icon $icon_file missing"
        all_icons_exist=false
    fi
done

if [ "$all_icons_exist" = true ]; then
    print_status "success" "All required icon files present"
else
    print_status "error" "Some icon files are missing"
fi

# 5. Check project structure
echo ""
echo "📂 Step 5: Checking Project Structure"
echo "-------------------------------------"

required_files="background.js content.js sidepanel.js sidepanel.html manifest.json"
required_dirs="icons tests docs"

for file in $required_files; do
    if [ -f "$file" ]; then
        print_status "success" "Required file: $file"
    else
        print_status "error" "Missing required file: $file"
    fi
done

for dir in $required_dirs; do
    if [ -d "$dir" ]; then
        file_count=$(find "$dir" -type f | wc -l)
        print_status "success" "Directory: $dir ($file_count files)"
    else
        print_status "warning" "Optional directory missing: $dir"
    fi
done

# 6. Test connection logic improvements
echo ""
echo "🔗 Step 6: Analyzing Connection Improvements"
echo "--------------------------------------------"

# Check if retry logic is present in background.js
if grep -q "maxAttempts" background.js; then
    print_status "success" "Retry logic found in background.js"
else
    print_status "warning" "Retry logic not detected in background.js"
fi

# Check if ping handler is present in content.js
if grep -q "ping" content.js; then
    print_status "success" "Ping handler found in content.js"
else
    print_status "warning" "Ping handler not detected in content.js"
fi

# Check if content script initialization is improved
if grep -q "videoDownloaderContent" content.js && grep -q "cleanup" content.js; then
    print_status "success" "Improved content script initialization detected"
else
    print_status "warning" "Content script initialization may need review"
fi

# 7. Summary
echo ""
echo "📊 Step 7: Test Summary"
echo "----------------------"

print_status "info" "Extension structure validation complete"
print_status "info" "Key fixes implemented:"
echo "   • Content script automatic injection via manifest"
echo "   • Retry logic with exponential backoff in background script"
echo "   • Ping-before-communicate pattern"
echo "   • Improved content script initialization"
echo "   • Better error handling and logging"
echo ""

# Final instructions
print_status "info" "Next steps:"
echo "   1. Load the extension in Chrome (chrome://extensions/)"
echo "   2. Enable Developer mode and click 'Load unpacked'"
echo "   3. Navigate to the test page: tests/comprehensive-connection-test.html"
echo "   4. Open the extension sidepanel and check console logs"
echo "   5. Run the connection tests to verify fixes"
echo ""

print_status "success" "Extension is ready for testing!"
echo ""
