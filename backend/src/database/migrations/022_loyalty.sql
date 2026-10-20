-- 022: Loyalty System

-- 1) loyalty_transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          varchar(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'refund')),
  points        integer NOT NULL,
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  reward_id     uuid,
  description   text,
  expires_at    timestamptz,
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_tx_customer_idx
  ON loyalty_transactions (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_tx_order_idx
  ON loyalty_transactions (order_id) WHERE order_id IS NOT NULL;

-- 2) rewards
CREATE TABLE IF NOT EXISTS rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar       varchar(160) NOT NULL,
  name_en       varchar(160) NOT NULL,
  description_ar text,
  description_en text,
  points_cost   integer NOT NULL CHECK (points_cost > 0),
  reward_type   varchar(30) NOT NULL CHECK (reward_type IN (
                  'discount_fixed',
                  'discount_percent',
                  'free_delivery',
                  'product'
                )),
  reward_value  numeric(12,2) NOT NULL DEFAULT 0 CHECK (reward_value >= 0),
  image_url     text,
  stock         integer CHECK (stock IS NULL OR stock >= 0),
  used_count    integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active     boolean NOT NULL DEFAULT true,
  starts_at     timestamptz,
  expires_at    timestamptz,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rewards_active_idx
  ON rewards (is_active, sort_order);

DROP TRIGGER IF EXISTS rewards_set_updated_at ON rewards;
CREATE TRIGGER rewards_set_updated_at BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3) settings
INSERT INTO settings (key, value, description) VALUES
  ('loyalty.enabled', 'true'::jsonb, 'Enable loyalty system'),
  ('loyalty.points_per_currency_unit', '0.01'::jsonb, 'Points earned per 1 currency unit (0.01 = 1 point per 100)'),
  ('loyalty.point_value_currency', '0.10'::jsonb, 'Value of 1 point in currency (0.10 = 10% back)'),
  ('loyalty.expiry_days', '365'::jsonb, 'Points expiry in days'),
  ('loyalty.min_redeem_points', '100'::jsonb, 'Minimum points to redeem')
ON CONFLICT (key) DO NOTHING;
