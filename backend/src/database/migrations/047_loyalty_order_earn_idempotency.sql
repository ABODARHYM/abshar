-- 047: make delivered-order loyalty earnings idempotent.
-- Historical duplicates are intentionally not deleted or rewritten; inspect them
-- before applying this migration to any database.
-- Fail with an actionable message if legacy duplicate earns exist. Never delete or rewrite ledger rows.
DO $
BEGIN
  IF EXISTS (
    SELECT order_id
    FROM loyalty_transactions
    WHERE type = 'earn' AND order_id IS NOT NULL
    GROUP BY order_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION '047 blocked: duplicate order-based earn transactions exist; reconcile the immutable loyalty ledger before retrying';
  END IF;
END $;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_transactions_order_earn_unique
  ON loyalty_transactions (order_id)
  WHERE type = 'earn' AND order_id IS NOT NULL;
