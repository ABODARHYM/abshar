-- 006: driver assignments, GPS locations

CREATE TABLE driver_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id     uuid NOT NULL REFERENCES drivers(user_id) ON DELETE RESTRICT,
  status        assignment_status NOT NULL DEFAULT 'offered',
  mode          assignment_mode NOT NULL DEFAULT 'manual',
  assigned_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  offered_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  responded_at  timestamptz,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER driver_assignments_set_updated_at BEFORE UPDATE ON driver_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- طلب واحد لا يملك أكثر من إسناد فعّال في نفس الوقت
CREATE UNIQUE INDEX driver_assignments_one_active_per_order
  ON driver_assignments (order_id) WHERE status IN ('offered', 'accepted');

CREATE TABLE driver_locations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id   uuid NOT NULL REFERENCES drivers(user_id) ON DELETE CASCADE,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  latitude    numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude   numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy    real CHECK (accuracy IS NULL OR accuracy >= 0),
  heading     real CHECK (heading IS NULL OR heading BETWEEN 0 AND 360),
  speed       real CHECK (speed IS NULL OR speed >= 0),
  recorded_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
