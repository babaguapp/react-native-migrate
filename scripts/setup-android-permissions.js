#!/usr/bin/env node

/**
 * Script to automatically add required permissions to AndroidManifest.xml
 * Run after: npx cap add android
 * Usage: node scripts/setup-android-permissions.js
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

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
  console.log('🔧 BaBaGu Android Permissions Setup\n');

  // Check if AndroidManifest.xml exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ AndroidManifest.xml not found!');
    console.error('   Make sure you ran: npx cap add android');
    console.error(`   Expected path: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  // Read current manifest
  let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');

  // Check if permissions already added
  if (manifest.includes('ACCESS_FINE_LOCATION')) {
    console.log('✅ Permissions already configured!');
    return;
  }

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

  console.log('✅ Permissions added successfully!\n');
  console.log('Added permissions:');
  console.log('   • ACCESS_COARSE_LOCATION');
  console.log('   • ACCESS_FINE_LOCATION');
  console.log('   • CAMERA');
  console.log('   • POST_NOTIFICATIONS\n');
  console.log('Next steps:');
  console.log('   1. npx cap sync android');
  console.log('   2. npx cap run android');
}

addPermissions();
