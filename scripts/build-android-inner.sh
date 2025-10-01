#!/bin/bash

set -e

echo "📋 Environment setup:"
echo "Node version:" $(node --version)
echo "NPM version:" $(npm --version)
echo "Android SDK:" ${ANDROID_HOME:-"(not set)"}
echo "Java version:" $(java -version 2>&1 | head -1)

echo ''
echo '📦 Installing dependencies (isolated npm cache)...'
export HOME=/tmp
export NPM_CONFIG_CACHE=/tmp/.npm
mkdir -p /tmp/.npm

if [ "${ALLOW_NPM_INSTALL_FALLBACK:-0}" = "1" ]; then
  # Clean any previous install to avoid permission issues
  rm -rf node_modules package-lock.json || true
  # Try clean install first, then fallback to refresh lockfile if needed
  if ! (HUSKY=0 CI=true npm ci --no-audit --no-fund); then
    echo '⚠️  npm ci failed (likely lockfile out-of-sync). Falling back to npm install...'
    HUSKY=0 CI=true npm install --include=dev --no-audit --no-fund
  fi
else
  HUSKY=0 CI=true npm ci --no-audit --no-fund
fi

echo ''
echo '🔧 Ensuring Expo CLI available...'
# Use npx to avoid global install requirements
npx --yes @expo/cli@latest --version >/dev/null 2>&1 || true

echo ''
echo '📱 Preparing Android project...'
# Ensure any previous android directory is removed before prebuild
rm -rf android

echo ''
echo '🏗️  Running Expo install & prebuild...'
npx expo install --fix
npx expo install expo-asset expo-font
npx expo prebuild --platform android

echo ''
echo '⚙️  Writing local.properties and ensuring NDK...'
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ -n "$ANDROID_HOME" ] && [ -x "$SDKMANAGER" ]; then
  if [ ! -d "$ANDROID_HOME/ndk" ] || [ -z "$(ls -A "$ANDROID_HOME/ndk" 2>/dev/null || true)" ]; then
    echo '🧰 Installing Android NDK (27.1.12297006)...'
    yes | "$SDKMANAGER" "ndk;27.1.12297006" || true
  fi
fi
NDK_DIR=""
if [ -d "$ANDROID_HOME/ndk/27.1.12297006" ]; then
  NDK_DIR="$ANDROID_HOME/ndk/27.1.12297006"
else
  NDK_DIR="$(ls -d "$ANDROID_HOME"/ndk/* 2>/dev/null | sort -V | tail -1)"
fi

mkdir -p android
echo "sdk.dir=${ANDROID_HOME:-/opt/android}" > android/local.properties
if [ -n "$NDK_DIR" ] && [ -d "$NDK_DIR" ]; then
  echo "ndk.dir=$NDK_DIR" >> android/local.properties
fi

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
  APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
  echo "📱 APK size: $APK_SIZE"
  ls -la app/build/outputs/apk/release/app-release.apk
else
  echo '❌ APK not found!'
  exit 1
fi 