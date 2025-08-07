#!/bin/bash

set -e

echo "🧪 Testing React Native Android container environment..."

# Container configuration
CONTAINER_IMAGE="docker.io/reactnativecommunity/react-native-android:latest"
CONTAINER_NAME="beegreen-test"
WORKSPACE_DIR="/workspace"

# Clean up any existing container
echo "🧹 Cleaning up existing containers..."
podman rm -f $CONTAINER_NAME 2>/dev/null || true

# Pull the latest image
echo "📦 Pulling React Native Android container..."
podman pull $CONTAINER_IMAGE

# Test the container environment
echo "🐳 Testing container environment..."
podman run -it --rm \
  --name $CONTAINER_NAME \
  -v "$(pwd):$WORKSPACE_DIR:Z" \
  -w $WORKSPACE_DIR \
  --user root \
  $CONTAINER_IMAGE \
  bash -c "
    echo '📋 Container Environment Check:'
    echo '================================'
    echo 'Node version:' \$(node --version)
    echo 'NPM version:' \$(npm --version)
    echo 'Android SDK location:' \$ANDROID_HOME
    echo 'Android SDK exists:' \$([ -d \$ANDROID_HOME ] && echo 'YES' || echo 'NO')
    echo 'Java version:' \$(java -version 2>&1 | head -1)
    echo 'Gradle available:' \$(which gradle && gradle --version | head -1 || echo 'NOT FOUND')
    echo ''
    echo '📱 Android SDK Tools:'
    echo 'SDK Manager:' \$([ -f \$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager ] && echo 'YES' || echo 'NO')
    echo 'ADB:' \$(which adb || echo 'NOT FOUND')
    echo ''
    echo '📦 Project files:'
    ls -la | head -10
    echo ''
    echo '🔍 Package.json check:'
    if [ -f package.json ]; then
      echo 'package.json found ✅'
      echo 'Project name:' \$(cat package.json | grep '\"name\"' | head -1)
    else
      echo 'package.json NOT found ❌'
    fi
    echo ''
    echo '✅ Container test completed!'
  "

echo ""
echo "🎉 Container test finished!"
echo ""
echo "If everything looks good, run './local-build.sh' to start the full build process." 