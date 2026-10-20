-- 017: Pricing Engine
-- إضافة settings للتسعير + أعمدة جديدة في delivery_zones

-- ═══════════════════════════════════════════════════════════════
-- 1) Pricing Settings
-- ═══════════════════════════════════════════════════════════════
INSERT INTO settings (key, value, description) VALUES
  ('pricing.default_delivery_fee', '500'::jsonb, 'Default delivery fee when no zone applies'),
  ('pricing.min_delivery_fee', '0'::jsonb, 'Minimum delivery fee (after all calculations)'),
  ('pricing.max_delivery_fee', '5000'::jsonb, 'Maximum delivery fee (after all calculations)'),
  ('pricing.free_delivery_threshold', '10000'::jsonb, 'Order total above this = free delivery (0 = disabled)'),
  ('pricing.surge_multiplier', '1.0'::jsonb, 'Global surge multiplier (1.0 = normal)'),
  ('pricing.fuel_surcharge', '0'::jsonb, 'Fixed fuel surcharge added to every order'),
  ('pricing.distance_rounding', '2'::jsonb, 'Decimal places for distance (km)')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2) Columns in delivery_zones
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric(12,2),
  ADD COLUMN IF NOT EXISTS surge_multiplier numeric(5,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS fuel_surcharge numeric(12,2) NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- 3) Constraints
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE delivery_zones
  DROP CONSTRAINT IF EXISTS delivery_zones_surge_valid,
  DROP CONSTRAINT IF EXISTS delivery_zones_fuel_valid,
  DROP CONSTRAINT IF EXISTS delivery_zones_free_threshold_valid;

ALTER TABLE delivery_zones
  ADD CONSTRAINT delivery_zones_surge_valid
    CHECK (surge_multiplier >= 0.5 AND surge_multiplier <= 5.0),
  ADD CONSTRAINT delivery_zones_fuel_valid
    CHECK (fuel_surcharge >= 0),
  ADD CONSTRAINT delivery_zones_free_threshold_valid
    CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold > 0);

-- ═══════════════════════════════════════════════════════════════
-- 4) Function: Haversine distance (km)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
) RETURNS numeric AS $$
DECLARE
  r constant numeric := 6371;
  d_lat numeric;
  d_lon numeric;
  a numeric;
  c numeric;
BEGIN
  d_lat := radians(lat2 - lat1);
  d_lon := radians(lon2 - lon1);
  a := sin(d_lat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════
-- 5) Index for zone lookup
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS delivery_zones_active_idx
  ON delivery_zones (is_active, city)
  WHERE is_active = true;

