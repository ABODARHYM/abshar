-- 016: Cancellation Metadata
-- إضافة actor + reason code + note للإلغاء
-- + دعم الطلبات المجدولة (scheduled_at)

-- ═══════════════════════════════════════════════════════════════
-- 1) Enum: cancellation_actor
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE cancellation_actor AS ENUM (
    'customer',
    'store',
    'driver',
    'admin',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2) Enum: cancellation_reason
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE cancellation_reason AS ENUM (
    'customer_changed_mind',
    'customer_wrong_address',
    'customer_too_long',
    'store_out_of_stock',
    'store_closed',
    'store_too_busy',
    'driver_unavailable',
    'driver_too_far',
    'payment_failed',
    'no_driver_found',
    'system_timeout',
    'admin_decision',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3) أعمدة جديدة في orders
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_actor cancellation_actor,
  ADD COLUMN IF NOT EXISTS cancellation_reason_code cancellation_reason,
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- 4) الفهرس لتحسين التقارير
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS orders_cancellation_actor_idx
  ON orders (cancellation_actor)
  WHERE cancellation_actor IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_scheduled_at_idx
  ON orders (scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 5) قيد: إذا status يشير إلى إلغاء مفصّل، actor يجب أن يكون محددًا
-- ملاحظة: 'cancelled' (legacy) معفى من هذا الشرط
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_cancellation_actor_required;

ALTER TABLE orders
  ADD CONSTRAINT orders_cancellation_actor_required
  CHECK (
    status NOT IN (
      'cancelled_by_customer'::order_status,
      'cancelled_by_store'::order_status,
      'cancelled_by_driver'::order_status,
      'cancelled_by_admin'::order_status
    )
    OR cancellation_actor IS NOT NULL
  );

-- ═══════════════════════════════════════════════════════════════
-- 6) دالة مساعدة: استخراج actor من status (للـ legacy)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cancellation_actor_from_status(s order_status)
RETURNS cancellation_actor AS $$
BEGIN
  CASE s
    WHEN 'cancelled_by_customer' THEN RETURN 'customer';
    WHEN 'cancelled_by_store'    THEN RETURN 'store';
    WHEN 'cancelled_by_driver'   THEN RETURN 'driver';
    WHEN 'cancelled_by_admin'    THEN RETURN 'admin';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
