#!/usr/bin/env node
// يولّد زوج مفاتيح VAPID لـ Web Push. انسخ الناتج إلى ملف .env
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('# أضف هذه الأسطر إلى backend/.env (واحتفظ بالمفتاح الخاص سرًّا)');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:info@absher-bi.com');
