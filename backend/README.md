# 🚀 ABSHER BI — أبشر بي

**منصة التوصيل الذكية من مأرب إلى اليمن**

REST API مبني على NestJS 11 + PostgreSQL 18

---

## 📊 حالة المشروع

| المؤشر | القيمة |
|---|---|
| NestJS Modules | 23 |
| API Endpoints | 118+ |
| DB Migrations | 24 |
| DB Tables | 46+ |
| E2E Tests | 41/41 ✅ |
| TypeScript Errors | 0 |
| **التقدم** | **95%** |

---

## 🎯 المراحل المنجزة

- [x] PHASE 1 — Order Engine + State Machine
- [x] PHASE 2 — Cancellation Endpoints
- [x] PHASE 3 — Delivery Pricing Engine
- [x] PHASE 4 — Multi-City (Marib)
- [x] PHASE 5 — Coupons
- [x] PHASE 6 — Driver Cash / Custody
- [x] PHASE 7 — Loyalty + Referral
- [ ] PHASE 8 — Notifications
- [ ] PHASE 9 — Frontend (PWA)
- [ ] PHASE 10 — Mobile (TWA)
- [ ] PHASE 11 — Deployment

---

## 🚀 التشغيل

\`\`\`bash
# 1. تثبيت
npm install

# 2. Migrations
for f in src/database/migrations/*.sql; do
  psql -U postgres -d absher_bi -f "\$f"
done

# 3. تشغيل
npm run start:dev
\`\`\`

---

## 🔗 الروابط

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/v1/health

---

**ABSHER BI — من مأرب... إلى كل اليمن** 🇾🇪

اطلبها، وأبشر بي.
