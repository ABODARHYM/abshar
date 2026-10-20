-- 015: Order States Extended
-- إضافة حالات إلغاء مفصلة + حالات مشاكل
-- backward-compatible: لا نحذف أي قيمة، نضيف فقط

-- 1) إضافة القيم الجديدة للـ enum
-- (PostgreSQL يسمح بالإضافة، لا الحذف)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_customer';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_store';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_driver';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_admin';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delayed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed';

-- 2) ملاحظة: القيمة القديمة 'cancelled' تبقى موجودة (backward-compatible)
--    سنُبقيها ونستخدمها كـ legacy

-- 3) تحديث الفهارس لتحسين queries على الحالات
-- الفهرس الحالي على status موجود، لا نحتاج جديد

-- 4) عمود actor_role الموجود في order_status_history يكفي للتتبع
--    لا نحتاج أعمدة جديدة
