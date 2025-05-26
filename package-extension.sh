#!/bin/bash

# Package Video Downloader Extension for distribution
echo "📦 Packaging Video Downloader Extension..."

# Create build directory
mkdir -p build

# Copy essential files to build directory
echo "📋 Copying files..."
cp manifest.json build/
cp background.js build/
cp content.js build/
cp inject.js build/
cp popup.html build/
cp popup.js build/
cp sidepanel.html build/
cp sidepanel.js build/
cp styles.css build/
cp -r icons build/
cp README.md build/
cp INSTALL.md build/

# Create zip file
echo "🗜️  Creating extension package..."
cd build
zip -r ../video-downloader-extension.zip . -x "*.DS_Store"
cd ..

# Clean up build directory
rm -rf build

echo "✅ Extension packaged successfully!"
echo "📁 Package created: video-downloader-extension.zip"
echo ""
echo "📖 To install from package:"
echo "1. Extract the zip file"
echo "2. Load the extracted folder as unpacked extension in Chrome"
echo ""
echo "🚀 For development, use: chrome://extensions/ → Load unpacked → Select this directory"
