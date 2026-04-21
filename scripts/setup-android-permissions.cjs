#!/usr/bin/env node

/**
 * Script to automatically add required permissions to AndroidManifest.xml
 * and check for Firebase configuration.
 * 
 * Run after: npx cap add android
 * Usage: node scripts/setup-android-permissions.js
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const GOOGLE_SERVICES_PATH = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

const PERMISSIONS_TO_ADD = `
    <!-- Geolocation permissions (required for location-based features) -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />

    <!-- Camera permissions (required for profile photos) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <!-- Push Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
`;

function addPermissions() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  🔧 BaBaGu Android Setup Script');
  console.log('='.repeat(60));
  console.log('');

  // Check if AndroidManifest.xml exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ AndroidManifest.xml not found!');
    console.error('');
    console.error('   Make sure you ran: npx cap add android');
    console.error(`   Expected path: ${MANIFEST_PATH}`);
    console.error('');
    process.exit(1);
  }

  // Read current manifest
  let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');

  // Check if permissions already added
  if (manifest.includes('ACCESS_FINE_LOCATION')) {
    console.log('📋 PERMISSIONS');
    console.log('   ✅ Already configured!');
  } else {
    // Find the position after <manifest ...> opening tag
    const manifestTagEnd = manifest.indexOf('>', manifest.indexOf('<manifest')) + 1;
    
    if (manifestTagEnd === 0) {
      console.error('❌ Could not parse AndroidManifest.xml');
      process.exit(1);
    }

    // Insert permissions after <manifest> tag
    const newManifest = 
      manifest.slice(0, manifestTagEnd) + 
      '\n' + PERMISSIONS_TO_ADD + 
      manifest.slice(manifestTagEnd);

    // Write updated manifest
    fs.writeFileSync(MANIFEST_PATH, newManifest, 'utf8');

    console.log('📋 PERMISSIONS');
    console.log('   ✅ Added successfully!');
    console.log('');
    console.log('   Added:');
    console.log('      • ACCESS_COARSE_LOCATION');
    console.log('      • ACCESS_FINE_LOCATION');
    console.log('      • CAMERA');
    console.log('      • POST_NOTIFICATIONS');
  }

  console.log('');
}

function checkFirebase() {
  console.log('🔥 FIREBASE (Push Notifications)');
  
  if (fs.existsSync(GOOGLE_SERVICES_PATH)) {
    console.log('   ✅ google-services.json found!');
  } else {
    console.log('   ⚠️  google-services.json NOT FOUND!');
    console.log('');
    console.log('   ╔════════════════════════════════════════════════════════╗');
    console.log('   ║  WARNING: App will CRASH when user grants notification ║');
    console.log('   ║  permission without Firebase configuration!            ║');
    console.log('   ╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('   To fix:');
    console.log('   1. Go to https://console.firebase.google.com/');
    console.log('   2. Create or select a project');
    console.log('   3. Add Android app with package name:');
    console.log('      app.lovable.9fa4bfe56f35495ebe00dc4071dec7d0');
    console.log('   4. Download google-services.json');
    console.log('   5. Place it in: android/app/google-services.json');
    console.log('   6. Run: npx cap sync android');
  }

  console.log('');
}

function printNextSteps() {
  console.log('='.repeat(60));
  console.log('  📝 NEXT STEPS');
  console.log('='.repeat(60));
  console.log('');
  
  if (!fs.existsSync(GOOGLE_SERVICES_PATH)) {
    console.log('  1. ⚠️  Add google-services.json (see above)');
    console.log('  2. npx cap sync android');
    console.log('  3. npx cap run android');
  } else {
    console.log('  1. npx cap sync android');
    console.log('  2. npx cap run android');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// Run
addPermissions();
checkFirebase();
printNextSteps();
