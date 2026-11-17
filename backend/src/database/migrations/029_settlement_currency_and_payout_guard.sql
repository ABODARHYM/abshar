-- Settlement currency and payout idempotency. Existing ambiguous legacy settlements remain NULL
-- and cannot be marked paid until reviewed; no historical ledger rows are changed or deleted.
ALTER TABLE settlements ADD COLUMN currency char(3);

-- Backfill only when every linked commission belongs to exactly one currency.
WITH settlement_currency AS (
  SELECT sc.settlement_id,
         MIN(o.currency::text)::char(3) AS currency
  FROM settlement_commissions sc
  JOIN commissions c ON c.id = sc.commission_id
  JOIN orders o ON o.id = c.order_id
  GROUP BY sc.settlement_id
  HAVING COUNT(DISTINCT o.currency) = 1
)
UPDATE settlements s
SET currency = x.currency
FROM settlement_currency x
WHERE x.settlement_id = s.id;

ALTER TABLE settlements
  ADD CONSTRAINT settlements_currency_iso_code_check
  CHECK (currency IS NULL OR btrim(currency::text) ~ '^[A-Z]{3}$') NOT VALID;
ALTER TABLE settlements VALIDATE CONSTRAINT settlements_currency_iso_code_check;

-- Fail safely if a prior release already wrote duplicate settlement payouts.
DO $$
DECLARE duplicate_ids text;
BEGIN
  SELECT string_agg(settlement_id::text || '=' || n::text, '; ')
    INTO duplicate_ids
  FROM (
    SELECT settlement_id, COUNT(*) AS n
    FROM transactions
    WHERE settlement_id IS NOT NULL
      AND type = 'settlement_payout'
      AND direction = 'debit'
    GROUP BY settlement_id
    HAVING COUNT(*) > 1
  ) d;
  IF duplicate_ids IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate settlement payout entries require manual review: %', duplicate_ids;
  END IF;
END $$;

CREATE UNIQUE INDEX transactions_one_payout_per_settlement
  ON transactions (settlement_id)
  WHERE settlement_id IS NOT NULL AND type = 'settlement_payout' AND direction = 'debit';
