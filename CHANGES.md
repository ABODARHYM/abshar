# ABSHER BI — سجل الإصلاحات (2026-10-15)

## Backend
- WebSocket: كان يقرأ JWT_SECRET (غير موجود) فتفشل كل المصادقات → الآن يستخدم JWT_ACCESS_SECRET ويرفض refresh tokens. CORS من CORS_ORIGINS. منع الانضمام لغرف مستخدمين آخرين.
- Push: VAPID ضمن الإعدادات المتحقَّق منها، PushService بمكتبة web-push، سكربت `npm run vapid:generate`.
- push/subscribe يقبل الصيغة القياسية للمتصفح {endpoint, keys:{p256dh,auth}} والقديمة المسطّحة.
- اشتراك Push يُنقل للمستخدم الجديد عند تبديل الحساب على نفس الجهاز.
- migration 025: إضافة is_active/updated_at لـ device_tokens (كانت تفشل على قاعدة جديدة).
  إن كانت 025 مطبّقة عندك مسبقًا (وللجدول العمودان):
  UPDATE schema_migrations SET checksum='30f0be0ac587eaf801bcba29c58ebc5c89afc7bcb2c51db3cc712c4f2d0c9548' WHERE name='025_notifications_v2.sql';
- engines: node >=22.12 (حزم @nestjs/jwt|passport|config v12 هي ESM). jest roots مصحّح.
- أضيف tsconfig.json و nest-cli.json (غير موجودَين في الـ zip الأصلي) — احتفظ بنسختك إن وُجدت.
- اختبارات جديدة: 48 اختبارًا ناجحًا.

## الواجهات (customer / driver / store)
- proxy موحّد: كل الطرق، يمرّر Authorization والـ query والـ body، BACKEND_URL، مهلة، حماية من ../
  (في العميل كان PATCH/DELETE يُسقطان Authorization).
- PWA: sw.js (كاش ثابت + offline + push)، manifest.json، offline.html، أيقونات؛ تسجيل الـ SW في السائق والمتجر.
- PushToggle في: إشعارات العميل، حساب السائق، إعدادات المتجر؛ وإلغاء الاشتراك عند تسجيل الخروج.
- authFetch (سائق/متجر): حذف طباعة التوكن في الـ console؛ تسجيل الخروج لا يمسح الثيم.
- WebSocket العميل: NEXT_PUBLIC_WS_URL بدل 127.0.0.1.
- أضيفت next.config.mjs و tsconfig و tailwind/postcss (غير موجودة في الـ zip) — احتفظ بنسخك إن وُجدت.
- next build ناجح للتطبيقات الثلاثة.

## تشغيل
backend: cp .env.example .env ثم npm i && npm run migrate && npm run build && npm run start
apps: cp .env.example .env.local ثم npm i && npm run build && npm run start
