import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.websko.babagu',
  appName: 'BaBaGu',
  webDir: 'dist',
  server: {
    // Dla emulatora Android: 10.0.2.2 wskazuje na localhost hosta
    // Dla fizycznego urządzenia: użyj swojego IP z sieci (np. 192.168.1.100)
    url: 'http://10.0.2.2:8080',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2dd4ce',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2dd4ce'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

// Note: After syncing, you'll need to configure:
// iOS: Add NSLocationWhenInUseUsageDescription to Info.plist
// Android: Add <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> to AndroidManifest.xml
// Push Notifications require additional setup:
// iOS: Enable Push Notifications capability in Xcode
// Android: Add google-services.json from Firebase Console

export default config;
