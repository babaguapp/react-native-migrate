# BaBaGu - Capacitor Mobile Setup Guide

This guide explains how to set up the native Android and iOS projects for BaBaGu.

## Prerequisites

- Node.js 18+
- For Android: Android Studio with SDK 33+
- For iOS: macOS with Xcode 15+

## Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd babagu
npm install
```

### 2. Add Native Platforms

```bash
# Add Android
npx cap add android

# Add iOS (macOS only)
npx cap add ios
```

### 3. Configure Android Permissions

After adding Android, run the permissions setup script:

```bash
node scripts/setup-android-permissions.js
```

This automatically adds required permissions for:
- **Location** (GPS for finding nearby meetings)
- **Camera** (profile photos)
- **Push Notifications**

### 4. Configure Firebase Cloud Messaging (REQUIRED for Push Notifications)

⚠️ **IMPORTANT**: Without Firebase configuration, the app will CRASH when user grants notification permission!

See the **Firebase Cloud Messaging Setup** section below.

### 5. Build and Sync

```bash
npm run build
npx cap sync
```

### 6. Run on Device/Emulator

```bash
# Android
npx cap run android

# iOS
npx cap run ios
```

---

## Firebase Cloud Messaging Setup (Android)

Push notifications on Android require Firebase Cloud Messaging (FCM). 

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Follow the setup wizard (you can disable Google Analytics if not needed)

### Step 2: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → **Android icon**
2. Enter Android package name:
   ```
   app.lovable.9fa4bfe56f35495ebe00dc4071dec7d0
   ```
3. (Optional) App nickname: `BaBaGu`
4. (Optional) Debug signing certificate SHA-1 (not required for basic FCM)
5. Click **"Register app"**

### Step 3: Download google-services.json

1. Click **"Download google-services.json"**
2. **Place the file in:** `android/app/google-services.json`

```
android/
└── app/
    ├── google-services.json  ← PUT FILE HERE
    ├── src/
    └── build.gradle
```

### Step 4: Verify Gradle Configuration

The Capacitor Push Notifications plugin should auto-configure Gradle. Verify these lines exist:

**android/build.gradle** (project-level):
```gradle
buildscript {
    dependencies {
        // ... other dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**android/app/build.gradle** (app-level, at the very bottom):
```gradle
apply plugin: 'com.google.gms.google-services'
```

### Step 5: Sync and Test

```bash
npx cap sync android
npx cap run android
```

### Troubleshooting Firebase

- **App crashes after granting notification permission**: `google-services.json` is missing or incorrect
- **Build fails with "google-services.json not found"**: File is in wrong location
- **FCM token not received**: Check Firebase Console → Project Settings → Cloud Messaging is enabled

---

## Manual Permission Setup (if script fails)

### Android: `android/app/src/main/AndroidManifest.xml`

Add these lines inside `<manifest>` tag, before `<application>`:

```xml
<!-- Geolocation permissions -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />

<!-- Camera permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Push Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS: Using Trapeze (No Xcode Required!)

You can configure iOS capabilities without opening Xcode using Trapeze:

```bash
# After adding iOS platform
npx cap add ios

# Run the setup script
node scripts/setup-ios-capabilities.js
```

This automatically:
- Adds Push Notifications entitlement (aps-environment)
- Configures Info.plist with location/camera descriptions

**Still required (in Apple Developer Portal):**
1. Enable "Push Notifications" for your App ID at https://developer.apple.com/account/resources/identifiers
2. Generate APNs Authentication Key and upload to Firebase Console
3. Download `GoogleService-Info.plist` from Firebase and place in `ios/App/App/`

### iOS: Manual Setup (with Xcode)

If you prefer manual setup, add these keys to `ios/App/App/Info.plist`:

```xml
<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>BaBaGu needs your location to find meetings near you.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BaBaGu needs your location to find meetings near you.</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>BaBaGu needs camera access for profile photos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>BaBaGu needs photo library access for profile photos.</string>
```

And enable Push Notifications in Xcode:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the App target → Signing & Capabilities
3. Click "+ Capability" → Push Notifications

---

## Development Mode (Hot Reload)

For instant updates during development without rebuilding:

### 1. Update `capacitor.config.ts`

The config already has:
```ts
server: {
  url: 'http://10.0.2.2:8080', // Android emulator
  cleartext: true
}
```

### 2. Start Dev Server

```bash
npm run dev -- --host --port 8080
```

### 3. Run App

```bash
npx cap run android
```

Changes in code will reflect immediately in the emulator!

### For Physical Device

Replace `10.0.2.2` with your computer's local IP (e.g., `192.168.1.100`).

---

## Emulator Location Setup

### Android Emulator

1. Open **Extended Controls** (three dots menu)
2. Go to **Location** tab
3. Set coordinates (e.g., Warsaw: 52.2297, 21.0122)
4. Click **Set Location**

### iOS Simulator

1. Go to **Features > Location**
2. Choose **Custom Location**
3. Enter coordinates

---

## Production Build

Before releasing, remove the `server.url` from `capacitor.config.ts`:

```ts
// Comment out or remove for production:
// server: {
//   url: 'http://10.0.2.2:8080',
//   cleartext: true
// }
```

Then build:

```bash
npm run build
npx cap sync
npx cap open android  # Opens in Android Studio
npx cap open ios      # Opens in Xcode
```

---

## Troubleshooting

### App crashes after granting notification permission
- **Most common cause**: Missing `google-services.json` file
- Ensure file is in `android/app/google-services.json`
- Verify Firebase project has correct package name
- Run `npx cap sync android` after adding the file

### App crashes on location prompt
- Ensure permissions are added to AndroidManifest.xml
- Run `node scripts/setup-android-permissions.js`
- Run `npx cap sync android` after adding permissions
- Enable location in emulator settings

### Location not working in emulator
- Set mock location in Extended Controls
- Make sure "Use location" is enabled in Android Settings

### Changes not reflecting
- Force stop the app and relaunch
- Check that dev server is running on correct port
- Verify `server.url` matches your setup

### Build errors
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npx cap sync android
npx cap run android
```

---

## Required Capacitor Plugins

Already installed in this project:
- `@capacitor/geolocation` - GPS location
- `@capacitor/camera` - Profile photos  
- `@capacitor/push-notifications` - Push notifications
- `@capacitor/preferences` - Local storage
