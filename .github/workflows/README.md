# GitHub Actions Setup

## Android Build Workflow

This repository includes a GitHub Action that automatically builds the Android app using a containerized build environment when a Pull Request is created or updated.

### Build Approach

The workflow uses a **containerized build** approach with the following benefits:
- **Consistent environment**: Uses `reactnativecommunity/react-native-android` Docker image
- **No external dependencies**: Builds directly using Android SDK and Gradle
- **Full control**: Complete control over the build process
- **Artifact storage**: APK files are stored as GitHub artifacts for easy download

### No Secrets Required

Unlike EAS builds, this containerized approach doesn't require any repository secrets. The build runs entirely within the GitHub Actions environment.

### Workflow Triggers

The workflow runs on:
- Pull Request opened
- Pull Request synchronized (new commits pushed)
- Pull Request reopened

### Build Process

1. **Container Setup**: Uses React Native Android container with pre-installed Android SDK
2. **Dependency Installation**: Installs npm dependencies
3. **Expo Prebuild**: Generates native Android project from Expo configuration
4. **Gradle Build**: Compiles and builds the release APK using Gradle
5. **Artifact Upload**: Uploads the APK as a GitHub artifact

### Build Configuration

The workflow:
- Uses `npx expo prebuild` to generate the Android project
- Builds a release APK using `./gradlew assembleRelease`
- Supports all Expo configurations from your `app.json`

### Output

When the workflow completes:
- A comment is added to the PR with build status and APK size
- If successful, the APK is uploaded as a GitHub artifact
- You can download the APK from the "Artifacts" section of the workflow run
- Build logs are available in the GitHub Actions tab

### Downloading the APK

1. Go to the workflow run in the Actions tab
2. Scroll down to the "Artifacts" section
3. Download the `android-apk-[commit-hash]` file
4. Extract and install the APK on your Android device 