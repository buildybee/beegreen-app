#!/bin/bash

set -e

echo "🚀 Starting local Android build using Podman..."

# Container configuration
CONTAINER_IMAGE="docker.io/reactnativecommunity/react-native-android:latest"
CONTAINER_NAME="beegreen-android-build"
WORKSPACE_DIR="/workspace"

# Clean up any existing container
echo "🧹 Cleaning up existing containers..."
podman rm -f $CONTAINER_NAME 2>/dev/null || true

# Pull the latest image
echo "📦 Pulling React Native Android container..."
podman pull $CONTAINER_IMAGE

# Run the container with the project mounted
echo "🐳 Starting build container..."
podman run -it --rm \
  --name $CONTAINER_NAME \
  -v "$(pwd):$WORKSPACE_DIR:Z" \
  -w $WORKSPACE_DIR \
  --user root \
  $CONTAINER_IMAGE \
  bash -c "
    set -e
    echo '📋 Environment setup:'
    echo 'Node version:' \$(node --version)
    echo 'NPM version:' \$(npm --version)
    echo 'Android SDK:' \$ANDROID_HOME
    echo 'Java version:' \$(java -version 2>&1 | head -1)
    
    echo ''
    echo '📦 Installing dependencies...'
    npm ci
    
    echo ''
    echo '🔧 Installing Expo CLI...'
    npm install -g @expo/cli
    
    echo ''
    echo '📱 Setting up Android build environment...'
    mkdir -p android
    echo 'sdk.dir=/opt/android' > android/local.properties
    echo 'ndk.dir=/opt/ndk' >> android/local.properties
      
    # Clean any existing android directory
    rm -rf android

    echo ''
    echo '🏗️  Running Expo prebuild...'
    npx expo install --fix
    
    npx expo prebuild --platform android
    
    echo ''
    echo '🔨 Building Android APK...'
    cd android
    chmod +x gradlew
    ./gradlew assembleRelease
    
    echo ''
    echo '✅ Build completed!'
    echo 'APK location: android/app/build/outputs/apk/release/app-release.apk'
    
    # Check if APK was created and show its size
    if [ -f app/build/outputs/apk/release/app-release.apk ]; then
      APK_SIZE=\$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
      echo \"📱 APK size: \$APK_SIZE\"
      ls -la app/build/outputs/apk/release/app-release.apk
    else
      echo '❌ APK not found!'
      exit 1
    fi
  "

echo ""
echo "🎉 Local build completed!"
echo "The APK should be available at: android/app/build/outputs/apk/release/app-release.apk" 