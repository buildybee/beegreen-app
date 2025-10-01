act pull_request \
  -e .github/test-event.json \
  -j build-android \
  -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04 \
  --env ACT=true \
  --env ANDROID_HOME=/root/.android/sdk