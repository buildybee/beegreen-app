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

# Fix permissions on existing node_modules if created by root previously
echo "🔐 Checking permissions on node_modules..."
if [ -d node_modules ] && [ ! -w node_modules ]; then
  echo "   Fixing ownership of node_modules to $(id -u):$(id -g)"
  podman unshare chown -R $(id -u):$(id -g) node_modules || true
fi

# Pull the latest image
echo "📦 Pulling React Native Android container..."
podman pull $CONTAINER_IMAGE

# Run the container with the project mounted
echo "🐳 Starting build container..."
podman run -it --rm \
  --name $CONTAINER_NAME \
  -v "$(pwd):$WORKSPACE_DIR:Z" \
  -w $WORKSPACE_DIR \
  --user $(id -u):$(id -g) \
  $CONTAINER_IMAGE \
  bash -s <<'BASH_EOF'
    set -e
    ALLOW_NPM_INSTALL_FALLBACK=1 bash scripts/build-android-inner.sh
BASH_EOF

echo ""
echo "🎉 Local build completed!"
echo "The APK should be available at: android/app/build/outputs/apk/release/app-release.apk" 