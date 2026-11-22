-- 046: Explicitly managed delivery coverage polygons.
-- Existing zones remain unverified until an administrator supplies and approves a boundary.
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS coverage_geojson jsonb,
  ADD COLUMN IF NOT EXISTS coverage_status varchar(20) NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS coverage_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS coverage_verified_by uuid,
  ADD COLUMN IF NOT EXISTS coverage_verification_note text;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_zones_coverage_status_check') THEN
    ALTER TABLE delivery_zones ADD CONSTRAINT delivery_zones_coverage_status_check
      CHECK (coverage_status IN ('unverified', 'verified', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_zones_coverage_verified_fields_check') THEN
    ALTER TABLE delivery_zones ADD CONSTRAINT delivery_zones_coverage_verified_fields_check
      CHECK (
        coverage_status <> 'verified' OR
        (coverage_geojson IS NOT NULL AND coverage_verified_at IS NOT NULL
         AND coverage_verified_by IS NOT NULL AND length(trim(coalesce(coverage_verification_note, ''))) >= 8)
      );
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS delivery_zones_coverage_status_idx
  ON delivery_zones (coverage_status, is_active);
