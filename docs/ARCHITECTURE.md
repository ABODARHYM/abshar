# قرارات التصميم - ABSHER BI

الأولويات: Stability > Security > Simplicity > Scalability > Low cost > Maintainability.

| القرار | السبب |
|---|---|
| NestJS + `pg` مباشرة (SQL parameterized) بدون ORM | تحكم كامل في الاستعلامات والـ Transactions، أقل تبعيات، لا سحر. الحماية من SQL Injection عبر المعاملات `$1,$2`. |
| هجرات SQL + runner خاص | Schema حقيقي بقيود CHECK/Trigger/Partial Index لا يعبّر عنه ORM جيدًا؛ checksum + lock يمنعان الأخطاء. |
| UUID للمفاتيح العامة، bigint للسجلات الضخمة (history, locations, ledger, audit) | لا كشف لتسلسل الأرقام، وأداء إدخال أفضل في الجداول الكبيرة. |
| Ledger غير قابل للتعديل | أي تصحيح مالي = قيد عكسي؛ الأرصدة تُحسب ولا تُعدَّل. |
| Snapshot للعنوان والأسعار داخل الطلب | تعديل المنتج/العنوان لاحقًا لا يغيّر طلبًا قديمًا. |
| OTP و Refresh Tokens و Reset Tokens تُخزَّن كـ hash | تسريب القاعدة لا يكشف أسرارًا صالحة. |
| `APP_TIER` في الـ Backend فقط | الواجهة لا تُعتمد للحماية. |
| Redis في PRO فقط | FREE يعمل بـ PostgreSQL وحده (أقل تكلفة). |
| Riverpod لـ Flutter (المراحل القادمة) | إدارة حالة واضحة قابلة للاختبار. |

## قيود معروفة / قرارات مؤجلة
- العملة والدولة ولغة الأرقام الهاتفية: تُحدَّد قبل المرحلة 5.
- حل تنبيهات Push في FREE يُحدَّد خلف `NotificationProvider` في المرحلة 10 (In-App كامل؛ Push خلفي يحتاج Backend + مزود، ولن يُدَّعى غير ذلك).
- مزود الخرائط لـ FREE: افتراضيًا OSM خلف `MapsProvider`، مع احترام شروط الاستخدام (لا استخدام مكثف لخوادم OSM العامة).
