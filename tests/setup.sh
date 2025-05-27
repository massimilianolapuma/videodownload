#!/bin/bash

# Video Downloader Extension - Quick Start Script
# This script provides shortcuts for common development tasks

echo "🎬 Video Downloader Chrome Extension"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

echo "📁 Project files:"
ls -la | grep -E '\.(js|json|html|md|svg)$' | awk '{print "   " $9}'
echo ""

echo "✅ Extension is ready for installation!"
echo ""
echo "📋 To install in Chrome:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable 'Developer mode' (top right toggle)"
echo "   3. Click 'Load unpacked'"
echo "   4. Select this folder: $(pwd)"
echo ""

echo "🔧 Development commands:"
echo "   npm run build    - Validate the extension"
echo "   npm run zip      - Create distribution package"
echo "   npm run dev      - Show development instructions"
echo ""

echo "🎯 Quick validation:"
# Simple manifest check
if grep -q '"manifest_version": 3' manifest.json; then
    echo "   ✅ Manifest V3 format"
else
    echo "   ❌ Invalid manifest format"
fi

if [ -f "background.js" ] && [ -f "content.js" ] && [ -f "popup.js" ]; then
    echo "   ✅ All core scripts present"
else
    echo "   ❌ Missing core scripts"
fi

if [ -d "icons" ] && [ -f "icons/icon16.svg" ]; then
    echo "   ✅ Icons available"
else
    echo "   ❌ Missing icons"
fi

echo ""
echo "🚀 Ready to load in Chrome! Follow the installation steps above."
