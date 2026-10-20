-- 018: Multi-City Core
-- جداول: cities, districts, areas
-- FK في: delivery_zones, addresses, stores

-- ═══════════════════════════════════════════════════════════════
-- 1) cities
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  char(2) NOT NULL,
  name_ar       varchar(120) NOT NULL,
  name_en       varchar(120) NOT NULL,
  slug          varchar(80) NOT NULL UNIQUE,
  latitude      numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude     numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  timezone      varchar(64) NOT NULL DEFAULT 'Asia/Aden',
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cities_country_idx
  ON cities (country_code, is_active, sort_order);
CREATE INDEX IF NOT EXISTS cities_slug_idx
  ON cities (slug);

DROP TRIGGER IF EXISTS cities_set_updated_at ON cities;
CREATE TRIGGER cities_set_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 2) districts
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS districts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id       uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name_ar       varchar(120) NOT NULL,
  name_en       varchar(120) NOT NULL,
  slug          varchar(80) NOT NULL,
  latitude      numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude     numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);
CREATE INDEX IF NOT EXISTS districts_city_idx
  ON districts (city_id, is_active, sort_order);

DROP TRIGGER IF EXISTS districts_set_updated_at ON districts;
CREATE TRIGGER districts_set_updated_at BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 3) areas
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS areas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name_ar       varchar(120) NOT NULL,
  name_en       varchar(120) NOT NULL,
  slug          varchar(80) NOT NULL,
  latitude      numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude     numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (district_id, slug)
);
CREATE INDEX IF NOT EXISTS areas_district_idx
  ON areas (district_id, is_active, sort_order);

DROP TRIGGER IF EXISTS areas_set_updated_at ON areas;
CREATE TRIGGER areas_set_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 4) delivery_zones — ربط بـ city_id + district_id
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES districts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS delivery_zones_city_district_idx
  ON delivery_zones (city_id, district_id, is_active);

-- ═══════════════════════════════════════════════════════════════
-- 5) addresses — ربط بـ city_id + district_id + area_id
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS addresses_city_idx
  ON addresses (city_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS addresses_district_idx
  ON addresses (district_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 6) stores — ربط بـ city_id + district_id
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES districts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stores_city_idx
  ON stores (city_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS stores_district_idx
  ON stores (district_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 7) pricing settings — إضافة multi_city flag
-- ═══════════════════════════════════════════════════════════════
INSERT INTO settings (key, value, description) VALUES
  ('geography.default_city_slug', '"marib"'::jsonb, 'Default city slug for new addresses/stores'),
  ('geography.default_country_code', '"YE"'::jsonb, 'Default country code'),
  ('geography.multi_city_enabled', 'true'::jsonb, 'Enable multi-city support')
ON CONFLICT (key) DO NOTHING;

