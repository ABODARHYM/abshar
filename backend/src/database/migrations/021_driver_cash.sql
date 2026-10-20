-- 021: Driver Cash / Custody System

-- 1) أعمدة في orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cash_collected_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS cash_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS cash_submitted_amount numeric(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS orders_cash_pending_idx
  ON orders (driver_id, cash_collected_at)
  WHERE payment_method = 'cash_on_delivery' AND cash_collected_at IS NOT NULL;

-- 2) settings
INSERT INTO settings (key, value, description) VALUES
  ('driver_cash.enabled', 'true'::jsonb, 'Enable driver cash tracking'),
  ('driver_cash.min_submit_amount', '0'::jsonb, 'Minimum amount for cash submission'),
  ('driver_cash.auto_alert_threshold', '10000'::jsonb, 'Alert if outstanding cash exceeds this')
ON CONFLICT (key) DO NOTHING;
