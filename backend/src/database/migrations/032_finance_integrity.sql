-- 032: Finance integrity, commission reservation, idempotent payouts.
-- Safe migration: aborts if historical settlements overlap ambiguously or ledger duplicates exist.
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS currency char(3);

CREATE TABLE IF NOT EXISTS settlement_commission_items (
  id bigserial PRIMARY KEY,
  settlement_id uuid NOT NULL REFERENCES settlements(id) ON DELETE RESTRICT,
  commission_id uuid NOT NULL REFERENCES commissions(id) ON DELETE RESTRICT,
  party_type ledger_account_type NOT NULL CHECK (party_type IN ('store', 'driver')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A commission can belong to at most one active settlement for each beneficiary type.
CREATE UNIQUE INDEX IF NOT EXISTS settlement_commission_items_active_unique
  ON settlement_commission_items (commission_id, party_type)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS settlement_commission_items_settlement_idx
  ON settlement_commission_items (settlement_id);

-- Detect historical overlap before backfilling. Never guess which settlement owns a commission.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM commissions c
    JOIN orders o ON o.id = c.order_id
    JOIN settlements s
      ON s.status <> 'cancelled'
     AND o.delivered_at::date BETWEEN s.period_start AND s.period_end
     AND (
       (s.party_type = 'store' AND s.party_id = c.store_id AND c.store_amount > 0)
       OR
       (s.party_type = 'driver' AND s.party_id = o.driver_id AND c.driver_amount > 0)
     )
    GROUP BY c.id, s.party_type
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 032 stopped: overlapping active historical settlements require manual reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM transactions
    WHERE order_id IS NOT NULL
      AND type IN ('store_earning', 'commission', 'driver_earning', 'cod_collection')
      AND direction = 'credit'
    GROUP BY order_id, account_type, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid), type, direction
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 032 stopped: duplicate order ledger entries require reconciliation before unique constraints';
  END IF;
END $$;

-- Preserve existing active settlement ownership in a traceable junction table.
INSERT INTO settlement_commission_items (settlement_id, commission_id, party_type, amount)
SELECT
  s.id,
  c.id,
  s.party_type,
  CASE WHEN s.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END
FROM settlements s
JOIN orders o
  ON o.delivered_at::date BETWEEN s.period_start AND s.period_end
JOIN commissions c
  ON c.order_id = o.id
 AND (
   (s.party_type = 'store' AND s.party_id = c.store_id)
   OR
   (s.party_type = 'driver' AND s.party_id = o.driver_id)
 )
WHERE s.status <> 'cancelled'
  AND CASE WHEN s.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END > 0
ON CONFLICT DO NOTHING;

-- Backfill currency only when all matched orders agree; leave ambiguous/unmatched legacy rows NULL.
UPDATE settlements s
SET currency = matched.currency
FROM (
  SELECT s2.id, MIN(o.currency)::char(3) AS currency
  FROM settlements s2
  JOIN orders o
    ON o.delivered_at::date BETWEEN s2.period_start AND s2.period_end
  JOIN commissions c ON c.order_id = o.id
  WHERE (s2.party_type = 'store' AND s2.party_id = c.store_id)
     OR (s2.party_type = 'driver' AND s2.party_id = o.driver_id)
  GROUP BY s2.id
  HAVING COUNT(DISTINCT o.currency) = 1
) matched
WHERE s.id = matched.id AND s.currency IS NULL;

-- Database-level idempotency for per-order ledger credits and per-settlement payouts.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_order_account_type_direction_unique
  ON transactions (
    order_id,
    account_type,
    (COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    type,
    direction
  )
  WHERE order_id IS NOT NULL
    AND type IN ('store_earning', 'commission', 'driver_earning', 'cod_collection')
    AND direction = 'credit';

CREATE UNIQUE INDEX IF NOT EXISTS transactions_settlement_payout_unique
  ON transactions (settlement_id)
  WHERE settlement_id IS NOT NULL
    AND type = 'settlement_payout'
    AND direction = 'debit';

