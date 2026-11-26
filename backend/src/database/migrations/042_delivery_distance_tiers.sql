-- 042: Distance-band delivery pricing per city/zone.
-- No default prices are inserted: administrators must configure each zone explicitly.

CREATE TABLE IF NOT EXISTS delivery_zone_distance_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  min_distance_km numeric(8,2) NOT NULL,
  max_distance_km numeric(8,2),
  delivery_fee numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_zone_distance_tiers_min_valid CHECK (min_distance_km >= 0),
  CONSTRAINT delivery_zone_distance_tiers_max_valid CHECK (
    max_distance_km IS NULL OR max_distance_km > min_distance_km
  ),
  CONSTRAINT delivery_zone_distance_tiers_fee_valid CHECK (delivery_fee >= 0)
);

CREATE INDEX IF NOT EXISTS delivery_zone_distance_tiers_lookup_idx
  ON delivery_zone_distance_tiers (zone_id, is_active, min_distance_km, max_distance_km);

CREATE OR REPLACE FUNCTION prevent_overlapping_delivery_distance_tiers()
RETURNS trigger AS $$
BEGIN
  -- Serialize edits for one zone so concurrent requests cannot create overlapping bands.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.zone_id::text, 42042));

  IF NEW.is_active AND EXISTS (
    SELECT 1
    FROM delivery_zone_distance_tiers t
    WHERE t.zone_id = NEW.zone_id
      AND t.is_active = true
      AND t.id <> NEW.id
      AND (NEW.max_distance_km IS NULL OR t.min_distance_km < NEW.max_distance_km)
      AND (t.max_distance_km IS NULL OR NEW.min_distance_km < t.max_distance_km)
  ) THEN
    RAISE EXCEPTION 'Active delivery distance tiers cannot overlap for the same zone'
      USING ERRCODE = '23514',
            CONSTRAINT = 'delivery_zone_distance_tiers_no_overlap';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delivery_zone_distance_tiers_no_overlap
  ON delivery_zone_distance_tiers;

CREATE TRIGGER delivery_zone_distance_tiers_no_overlap
  BEFORE INSERT OR UPDATE ON delivery_zone_distance_tiers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_overlapping_delivery_distance_tiers();
