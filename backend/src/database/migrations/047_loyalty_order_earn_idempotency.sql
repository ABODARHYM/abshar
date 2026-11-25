-- 047: make delivered-order loyalty earnings idempotent.
-- Historical duplicates are intentionally not deleted or rewritten; inspect them
-- before applying this migration to any database.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_transactions_order_earn_unique
  ON loyalty_transactions (order_id)
  WHERE type = 'earn' AND order_id IS NOT NULL;
