-- 013: Smart Dispatch System
-- يضيف حقول للـ driver_assignments لتتبع جولات الإرسال

ALTER TABLE driver_assignments
  ADD COLUMN IF NOT EXISTS round_number smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS distance_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS tier smallint NOT NULL DEFAULT 1;

-- فهرس للبحث السريع عن العروض المنتهية
CREATE INDEX IF NOT EXISTS driver_assignments_expires_idx
  ON driver_assignments (expires_at)
  WHERE status = 'offered';

-- فهرس للبحث عن العروض النشطة لكل سائق
CREATE INDEX IF NOT EXISTS driver_assignments_driver_active_idx
  ON driver_assignments (driver_id, status)
  WHERE status IN ('offered', 'accepted');
