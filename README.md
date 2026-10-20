# ABSHER BI | أبشر بي

منصة توصيل Multi-Vendor: تطبيق العميل، تطبيق المتجر، تطبيق المندوب، لوحة الإدارة، Backend (NestJS)، قاعدة PostgreSQL.
**لا Firebase ولا Supabase.** Flutter لا يتصل بقاعدة البيانات أبدًا؛ كل شيء عبر REST API (و WebSocket للأحداث الفورية).

```
Flutter ──HTTPS REST──▶ NestJS ──▶ PostgreSQL
Flutter ◀──WebSocket──▶ NestJS ──▶ PostgreSQL
```

## حالة التنفيذ (بصدق)

| المرحلة | الحالة |
|---|---|
| 0 فحص البيئة | تمّ |
| 1 Monorepo | تمّ (backend + docker + env + docs) |
| 2 NestJS Backend (الأساس) | **مكتوب، غير مُشغَّل** — config/validation, errors, pagination, DB service, health, Swagger |
| 3 PostgreSQL | **مكتوب، غير مُشغَّل** — 11 migration (39 جدول، 19 enum، فهارس، بيانات مرجعية) + runner |
| 4 Auth + RBAC … 17 Production | لم تبدأ |

**ما تحقّق منه فعليًا:** صيغة كل ملفات TypeScript (24 ملف، 0 أخطاء)، منطق ترتيب/فحص الهجرات (assertions)، وترتيب الجداول والـ FK والأعمدة في الـ SQL بفحص ثابت.
**ما لم يُشغَّل:** `npm install`، `nest build`، Jest، تنفيذ SQL على PostgreSQL فعليًا، Docker. السبب: بيئة الإنشاء بلا شبكة ولا PostgreSQL ولا Docker. شغّل الخطوات أدناه لتتأكد، وأي خطأ يظهر أصلحه قبل الانتقال للمرحلة التالية.

## المتطلبات
Node.js ≥ 20.6 · Docker + Docker Compose · (لاحقًا) Flutter SDK

## التشغيل السريع (Docker)
```bash
cp .env.example .env            # ثم غيّر كل القيم change-me
docker compose up -d --build    # PostgreSQL + Backend (الهجرات تُطبَّق تلقائيًا قبل التشغيل)
curl http://localhost:3000/api/v1/health/ready
# Swagger: http://localhost:3000/api/docs   (SWAGGER_ENABLED=true)
```

## التطوير بدون Docker للـ Backend
```bash
docker compose up -d db         # قاعدة البيانات فقط
cd backend
npm install                     # يولّد package-lock.json (ارفعه إلى Git)
npm run migrate                 # يطبّق الهجرات
npm run start:dev
npm run typecheck && npm test
```

## الهيكل
```
absher-bi/
├─ docker-compose.yml        PostgreSQL + Backend (+ Redis بـ profile "pro")
├─ .env.example              كل متغيرات البيئة (لا أسرار حقيقية)
├─ docs/ARCHITECTURE.md      قرارات التصميم
└─ backend/
   ├─ src/
   │  ├─ config/             تحقق صارم من البيئة + AppTier + ميزات FREE/PRO
   │  ├─ common/             Exception filter (code/message/details/requestId), validation, pagination, request-id
   │  ├─ database/           DatabaseService (pg Pool), migrate.ts, migrations/*.sql
   │  ├─ health/             /health و /health/ready
   │  └─ main.ts             Helmet, CORS, compression, Swagger, ValidationPipe
   └─ test/                  اختبارات تكامل بدون قاعدة حقيقية
```
كل Module جديد يُضاف تحت `src/modules/<name>/` (controller, service, repository, dto).

## قاعدة البيانات والهجرات
- هجرات SQL حقيقية: `backend/src/database/migrations/NNN_name.sql`.
- `npm run migrate` / `npm run migrate:status` / (production) `node dist/database/migrate.js up`.
- كل هجرة داخل Transaction، مع advisory lock، و checksum يمنع تعديل هجرة طُبِّقت. أي تغيير في Schema = هجرة جديدة. لا تعديل يدوي على الإنتاج.
- جداول append-only بـ Trigger (لا UPDATE/DELETE): `transactions` (Ledger)، `order_status_history`، `audit_logs`.
- قيود تحمي المنطق في القاعدة: `orders.total = subtotal + delivery_fee - discount_total`، إسناد فعّال واحد لكل طلب، عنوان افتراضي واحد لكل مستخدم، مفتاح Idempotency فريد لكل عميل.
- العملة الافتراضية في `settings.currency` هي `USD` **مؤقتًا** — غيّرها لسوقك قبل الإطلاق.

## متغيرات البيئة
راجع `.env.example`. الإقلاع يفشل فورًا إذا: `DATABASE_URL` ناقص، سر JWT أقل من 32 حرفًا، `APP_TIER` غير صالح، `REDIS_URL` ناقص في PRO، أو (في production/staging) سر افتراضي/متطابق أو CORS بـ `*`.

## FREE / PRO
نواة واحدة. `APP_TIER=FREE|PRO` يُقرأ في الـ Backend فقط، وتُشتق منه `features` (Smart Dispatch، Wallets، Redis…). الاستبدال يتم عبر Providers (Notification, Maps, Dispatch, Payment, Storage, Finance) في المرحلة 14 دون تغيير منطق التطبيق. الواجهة قد تخفي ميزات، لكن الحماية الفعلية في الـ Backend.

## صيغة الأخطاء
```json
{ "code": "VALIDATION_FAILED", "message": "Validation failed", "details": [{"field":"email","constraints":["..."]}], "requestId": "..." }
```
تطبيق Flutter يحوّل `code` إلى رسالة عربية محلية (لا نصوص مضمّنة في Widgets).

## الاختبارات
`npm test` في `backend/`: التحقق من البيئة، الهجرات (بما فيها وجود كل الجداول المطلوبة وكل حالات الطلب الـ 13)، فلتر الأخطاء، الـ Pagination، و Health endpoints. اختبارات الطلب الكامل (state machine) تأتي مع المرحلة 8 و15.

## النشر
لا تعرض PostgreSQL للشبكة. شغّل الـ Backend خلف Reverse Proxy بـ HTTPS (Nginx/Caddy/Load Balancer)، واجعل `SWAGGER_ENABLED=false` و `NODE_ENV=production`، وولّد أسرارًا جديدة (`openssl rand -base64 48`)، واستخدم قاعدة منفصلة لكل بيئة (development / staging / production).
