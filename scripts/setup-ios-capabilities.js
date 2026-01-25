#!/usr/bin/env node

/**
 * Script to configure iOS capabilities using Trapeze
 * This allows setting up Push Notifications without opening Xcode
 * 
 * Run after: npx cap add ios
 * Usage: node scripts/setup-ios-capabilities.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IOS_PATH = path.join(__dirname, '..', 'ios');
const TRAPEZE_CONFIG = path.join(__dirname, '..', 'trapeze.config.yaml');

function setupIOS() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  🍎 BaBaGu iOS Setup Script (using Trapeze)');
  console.log('='.repeat(60));
  console.log('');

  // Check if iOS folder exists
  if (!fs.existsSync(IOS_PATH)) {
    console.error('❌ iOS folder not found!');
    console.error('');
    console.error('   Make sure you ran: npx cap add ios');
    console.error(`   Expected path: ${IOS_PATH}`);
    console.error('');
    process.exit(1);
  }

  // Check if trapeze config exists
  if (!fs.existsSync(TRAPEZE_CONFIG)) {
    console.error('❌ trapeze.config.yaml not found!');
    console.error(`   Expected path: ${TRAPEZE_CONFIG}`);
    process.exit(1);
  }

  console.log('📱 iOS folder found at:', IOS_PATH);
  console.log('');

  // Run Trapeze
  console.log('🔧 Running Trapeze to configure iOS capabilities...');
  console.log('');

  try {
    execSync('npx trapeze run trapeze.config.yaml -y --ios-project ios/App', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('  ✅ iOS Configuration Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 What was configured:');
    console.log('   • Push Notifications entitlement (aps-environment)');
    console.log('   • Location usage descriptions');
    console.log('   • Camera usage descriptions');
    console.log('');
    console.log('⚠️  IMPORTANT - Still required:');
    console.log('');
    console.log('   1. Apple Developer Portal:');
    console.log('      • Go to https://developer.apple.com/account/resources/identifiers');
    console.log('      • Enable "Push Notifications" capability for your App ID');
    console.log('');
    console.log('   2. Firebase Console (for FCM):');
    console.log('      • Add iOS app with bundle ID: app.lovable.9fa4bfe56f35495ebe00dc4071dec7d0');
    console.log('      • Upload APNs Authentication Key (.p8 file)');
    console.log('      • Download GoogleService-Info.plist');
    console.log('      • Place it in: ios/App/App/GoogleService-Info.plist');
    console.log('');
    console.log('   3. For App Store builds:');
    console.log('      • Change aps-environment to "production" in trapeze.config.yaml');
    console.log('      • Re-run this script');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Trapeze configuration failed!');
    console.error('');
    console.error('   Error:', error.message);
    console.error('');
    console.error('   Try running manually:');
    console.error('   npx trapeze run trapeze.config.yaml -y --ios-project ios/App');
    console.error('');
    process.exit(1);
  }
}

// Also provide Android setup option
function setupAndroid() {
  console.log('');
  console.log('🤖 Running Trapeze for Android...');
  console.log('');

  try {
    execSync('npx trapeze run trapeze.config.yaml -y --android-project android', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('✅ Android configuration complete!');
  } catch (error) {
    console.error('❌ Android configuration failed:', error.message);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const platform = args[0] || 'ios';

if (platform === 'android') {
  setupAndroid();
} else if (platform === 'all') {
  setupIOS();
  setupAndroid();
} else {
  setupIOS();
}
