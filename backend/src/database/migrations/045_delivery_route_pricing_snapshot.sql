-- 045: Persist the exact delivery quote inputs/results used when an order is placed.
-- Additive only: existing orders remain intact and historical unknown values stay NULL.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_distance_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_distance_tier_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_distance_source varchar(40),
  ADD COLUMN IF NOT EXISTS delivery_pricing_version integer,
  ADD COLUMN IF NOT EXISTS delivery_pricing_snapshot jsonb;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_distance_nonnegative_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_distance_nonnegative_check
      CHECK (delivery_distance_km IS NULL OR delivery_distance_km >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_pricing_version_positive_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_pricing_version_positive_check
      CHECK (delivery_pricing_version IS NULL OR delivery_pricing_version > 0);
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS orders_delivery_zone_snapshot_idx
  ON orders (delivery_zone_id, created_at DESC)
  WHERE delivery_zone_id IS NOT NULL;
