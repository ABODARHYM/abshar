-- 044: Separate Yemen administrative divisions from delivery localities.
-- Safe, additive migration: preserve all existing IDs and historical address links.
-- No national geography is seeded here until an authoritative source is selected.

CREATE TABLE IF NOT EXISTS governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code char(2) NOT NULL DEFAULT 'YE',
  name_ar varchar(120) NOT NULL,
  name_en varchar(120) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  source_name varchar(160),
  source_url text,
  source_updated_at date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS administrative_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id uuid NOT NULL REFERENCES governorates(id) ON DELETE RESTRICT,
  name_ar varchar(120) NOT NULL,
  name_en varchar(120) NOT NULL,
  slug varchar(80) NOT NULL,
  source_name varchar(160),
  source_url text,
  source_updated_at date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate_id, slug)
);

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS governorate_id uuid
    REFERENCES governorates(id) ON DELETE RESTRICT;

ALTER TABLE districts
  ADD COLUMN IF NOT EXISTS administrative_district_id uuid
    REFERENCES administrative_districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS locality_type varchar(24) NOT NULL DEFAULT 'neighborhood',
  ADD COLUMN IF NOT EXISTS source_status varchar(24) NOT NULL DEFAULT 'legacy_unverified',
  ADD CONSTRAINT districts_locality_type_check
    CHECK (locality_type IN ('administrative_district', 'neighborhood', 'locality', 'delivery_zone')),
  ADD CONSTRAINT districts_source_status_check
    CHECK (source_status IN ('verified', 'community_verified', 'legacy_unverified', 'imported_unverified'));

ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS locality_type varchar(24) NOT NULL DEFAULT 'locality',
  ADD COLUMN IF NOT EXISTS source_status varchar(24) NOT NULL DEFAULT 'legacy_unverified',
  ADD CONSTRAINT areas_locality_type_check
    CHECK (locality_type IN ('neighborhood', 'street', 'landmark', 'locality')),
  ADD CONSTRAINT areas_source_status_check
    CHECK (source_status IN ('verified', 'community_verified', 'legacy_unverified', 'imported_unverified'));

CREATE INDEX IF NOT EXISTS cities_governorate_idx
  ON cities (governorate_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS administrative_districts_governorate_idx
  ON administrative_districts (governorate_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS districts_admin_district_idx
  ON districts (administrative_district_id, is_active, sort_order);

-- Preserve legacy names as aliases when a verified replacement is later introduced.
-- Polymorphic entity references intentionally avoid cascading deletes from historical records.
CREATE TABLE IF NOT EXISTS geography_name_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(24) NOT NULL
    CHECK (entity_type IN ('governorate', 'administrative_district', 'city', 'district', 'area')),
  entity_id uuid NOT NULL,
  old_name_ar varchar(160) NOT NULL,
  normalized_name varchar(180) NOT NULL,
  source_name varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT geography_name_aliases_unique
    UNIQUE (entity_type, entity_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS geography_name_aliases_lookup_idx
  ON geography_name_aliases (entity_type, normalized_name);

-- Migration 019 generated random offsets for Marib area coordinates and used
-- neighborhood names in the districts table. These points are not reliable
-- enough for distance charging. Keep all rows and IDs, but clear only the
-- untrustworthy coordinates; distance calculation must use verified points.
UPDATE areas a
SET latitude = NULL, longitude = NULL, source_status = 'legacy_unverified'
FROM districts d
JOIN cities c ON c.id = d.city_id
WHERE a.district_id = d.id
  AND c.slug = 'marib';

UPDATE districts d
SET latitude = NULL, longitude = NULL,
    locality_type = 'neighborhood',
    source_status = 'legacy_unverified'
FROM cities c
WHERE d.city_id = c.id
  AND c.slug = 'marib';

-- Do not auto-apply a fee or create distance tiers. Admins must configure
-- reviewed service areas and distance bands after verified coordinates exist.
