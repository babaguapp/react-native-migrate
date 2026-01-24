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

### 4. Build and Sync

```bash
npm run build
npx cap sync
```

### 5. Run on Device/Emulator

```bash
# Android
npx cap run android

# iOS
npx cap run ios
```

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

### iOS: `ios/App/App/Info.plist`

Add these keys inside the `<dict>` section:

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

### App crashes on location prompt
- Ensure permissions are added to AndroidManifest.xml
- Run `npx cap sync android` after adding permissions
- Enable location in emulator settings

### Location not working in emulator
- Set mock location in Extended Controls
- Make sure "Use location" is enabled in Android Settings

### Changes not reflecting
- Force stop the app and relaunch
- Check that dev server is running on correct port
- Verify `server.url` matches your setup

---

## Required Capacitor Plugins

Already installed in this project:
- `@capacitor/geolocation` - GPS location
- `@capacitor/camera` - Profile photos  
- `@capacitor/push-notifications` - Push notifications
- `@capacitor/preferences` - Local storage
