#!/usr/bin/env node

// Run this script to generate VAPID keys for push notifications
// Then add these to your Vercel environment variables

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n========================================');
console.log('VAPID Keys for Push Notifications');
console.log('========================================\n');
console.log('NEXT_PUBLIC_VAPID_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n========================================\n');
console.log('Add these to your Vercel environment variables:');
console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. Add NEXT_PUBLIC_VAPID_KEY with the public key');
console.log('3. Add VAPID_PRIVATE_KEY with the private key\n');
