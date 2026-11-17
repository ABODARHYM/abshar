-- 032: Finance integrity, commission reservation, idempotent payouts.
-- Safe migration: aborts if historical settlements overlap ambiguously or their totals/currencies do not reconcile.
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS currency char(3);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key text;

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

-- Detect historical overlap in the canonical migration-027 reservation links; never infer ownership from date ranges.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM settlement_commissions sc
    JOIN settlements s ON s.id = sc.settlement_id
    WHERE s.status <> 'cancelled' AND sc.released_at IS NULL
    GROUP BY sc.commission_id, sc.party_type
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 032 stopped: overlapping active historical settlements require manual reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM settlements s
    LEFT JOIN settlement_commissions sc
      ON sc.settlement_id = s.id AND sc.released_at IS NULL
    LEFT JOIN commissions c ON c.id = sc.commission_id
    LEFT JOIN orders o ON o.id = c.order_id
    WHERE s.status <> 'cancelled'
    GROUP BY s.id, s.party_type, s.net_amount
    HAVING COALESCE(SUM(
      CASE
        WHEN s.party_type = 'store' THEN c.store_amount
        WHEN s.party_type = 'driver' THEN c.driver_amount
        ELSE 0
      END
    ), 0) <> s.net_amount
       OR COUNT(DISTINCT CASE
            WHEN s.party_type = 'store' AND c.store_amount > 0 THEN o.currency
            WHEN s.party_type = 'driver' AND c.driver_amount > 0 THEN o.currency
          END) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 032 stopped: historical settlement totals or currencies do not reconcile to delivered commissions';
  END IF;
END $$;

-- Copy exact existing active settlement ownership from migration 027 into the amount-bearing table.
INSERT INTO settlement_commission_items (settlement_id, commission_id, party_type, amount)
SELECT
  s.id,
  c.id,
  s.party_type,
  CASE WHEN s.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END
FROM settlements s
JOIN settlement_commissions sc
  ON sc.settlement_id = s.id AND sc.released_at IS NULL
JOIN commissions c ON c.id = sc.commission_id
WHERE s.status <> 'cancelled'
  AND CASE WHEN sc.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END > 0
ON CONFLICT DO NOTHING;

-- Backfill currency only when all matched orders agree; leave ambiguous/unmatched legacy rows NULL.
UPDATE settlements s
SET currency = matched.currency
FROM (
  SELECT s2.id, MIN(o.currency)::char(3) AS currency
  FROM settlements s2
  JOIN settlement_commissions sc
    ON sc.settlement_id = s2.id AND sc.released_at IS NULL
  JOIN commissions c ON c.id = sc.commission_id
  JOIN orders o ON o.id = c.order_id
  WHERE s2.status <> 'cancelled'
    AND CASE WHEN sc.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END > 0
  GROUP BY s2.id
  HAVING COUNT(DISTINCT o.currency) = 1
) matched
WHERE s.id = matched.id AND s.currency IS NULL;

-- Historical ledger rows remain immutable with a NULL key. New writes must carry a stable idempotency key.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_unique
  ON transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
