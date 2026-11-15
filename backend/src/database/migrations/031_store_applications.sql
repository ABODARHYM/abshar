-- 031: Store owner onboarding applications
-- Creates application records only. Does not create users or stores.
-- This migration must be reviewed before applying to any database.

BEGIN;

CREATE TABLE IF NOT EXISTS store_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_full_name varchar(160) NOT NULL,
    phone varchar(20) NOT NULL,
    password_hash text,

    store_name_ar varchar(160) NOT NULL,
    store_name_en varchar(160),
    platform_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,

    city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
    district_id uuid REFERENCES districts(id) ON DELETE SET NULL,
    zone_id uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,

    address_text varchar(255) NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,

    contact_phone varchar(20),
    contact_email varchar(255),

    tracking_token_hash text NOT NULL,

    status varchar(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),

    review_note text,
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,

    created_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_store_id uuid REFERENCES stores(id) ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT store_applications_latitude_check
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),

    CONSTRAINT store_applications_longitude_check
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),

    CONSTRAINT store_applications_review_state_check
      CHECK (
        (status = 'pending' AND reviewed_at IS NULL)
        OR
        (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
      )
);

CREATE INDEX IF NOT EXISTS store_applications_status_created_idx
  ON store_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS store_applications_phone_idx
  ON store_applications (phone);

CREATE UNIQUE INDEX IF NOT EXISTS store_applications_tracking_token_idx
  ON store_applications (tracking_token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS store_applications_one_pending_phone_idx
  ON store_applications (phone)
  WHERE status = 'pending';

COMMIT;
