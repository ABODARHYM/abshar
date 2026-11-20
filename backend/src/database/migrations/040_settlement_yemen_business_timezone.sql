-- 040: Validate settlement reservations using Yemen business dates (Asia/Aden).
-- No historical rows are rewritten. Ambiguous reservations stop this migration for review.
DO $$
DECLARE
  mismatch uuid;
BEGIN
  WITH expected AS (
    SELECT s.id,
      COALESCE((
        SELECT array_agg(c.id ORDER BY c.id)
        FROM commissions c
        JOIN orders o ON o.id = c.order_id
        WHERE (
          (s.party_type = 'store' AND c.store_id = s.party_id)
          OR (s.party_type = 'driver' AND o.driver_id = s.party_id)
        )
          AND o.status = 'delivered'
          AND o.delivered_at >= (s.period_start::timestamp AT TIME ZONE 'Asia/Aden')
          AND o.delivered_at < ((s.period_end + 1)::timestamp AT TIME ZONE 'Asia/Aden')
          AND (CASE WHEN s.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END) > 0
          AND NOT EXISTS (
            SELECT 1
            FROM settlement_commission_items other_item
            WHERE other_item.commission_id = c.id
              AND other_item.party_type = s.party_type
              AND other_item.released_at IS NULL
              AND other_item.settlement_id <> s.id
          )
      ), ARRAY[]::uuid[]) AS commission_ids
    FROM settlements s
    WHERE s.status <> 'cancelled'
  ),
  actual AS (
    SELECT s.id,
      COALESCE(
        array_agg(item.commission_id ORDER BY item.commission_id)
          FILTER (WHERE item.id IS NOT NULL),
        ARRAY[]::uuid[]
      ) AS commission_ids
    FROM settlements s
    LEFT JOIN settlement_commission_items item
      ON item.settlement_id = s.id AND item.released_at IS NULL
    WHERE s.status <> 'cancelled'
    GROUP BY s.id
  )
  SELECT e.id INTO mismatch
  FROM expected e
  JOIN actual a ON a.id = e.id
  WHERE e.commission_ids IS DISTINCT FROM a.commission_ids
  LIMIT 1;

  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement % reservations do not match Yemen local business dates; manual reconciliation is required', mismatch;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM settlement_commission_items item
    LEFT JOIN settlement_commissions legacy
      ON legacy.settlement_id = item.settlement_id
     AND legacy.commission_id = item.commission_id
     AND legacy.party_type = item.party_type
     AND legacy.released_at IS NULL
    WHERE item.released_at IS NULL AND legacy.commission_id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM settlement_commissions legacy
    JOIN commissions c ON c.id = legacy.commission_id
    LEFT JOIN settlement_commission_items item
      ON item.settlement_id = legacy.settlement_id
     AND item.commission_id = legacy.commission_id
     AND item.party_type = legacy.party_type
     AND item.released_at IS NULL
    WHERE legacy.released_at IS NULL
      AND (CASE WHEN legacy.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END) > 0
      AND item.commission_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy and canonical settlement reservation records differ; manual reconciliation is required';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_settlement_commission_party()
RETURNS trigger AS $$
DECLARE
  v_party_type ledger_account_type;
  v_party_id uuid;
  v_period_start date;
  v_period_end date;
  v_settlement_status settlement_status;
  v_store_id uuid;
  v_driver_id uuid;
  v_order_status order_status;
  v_delivered_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.settlement_id IS DISTINCT FROM OLD.settlement_id
       OR NEW.commission_id IS DISTINCT FROM OLD.commission_id
       OR NEW.party_type IS DISTINCT FROM OLD.party_type
       OR NEW.party_id IS DISTINCT FROM OLD.party_id
       OR NEW.linked_at IS DISTINCT FROM OLD.linked_at THEN
      RAISE EXCEPTION 'Settlement commission link identity is immutable';
    END IF;
    IF OLD.released_at IS NOT NULL OR NEW.released_at IS NULL THEN
      RAISE EXCEPTION 'Settlement commission reservation can only be released once';
    END IF;
    IF NEW.released_at IS NOT NULL AND v_settlement_status <> 'cancelled' THEN
      RAISE EXCEPTION 'Settlement commission reservation can only be released when the settlement is cancelled';
    END IF;
  END IF;

  SELECT party_type, party_id, period_start, period_end, status
    INTO v_party_type, v_party_id, v_period_start, v_period_end, v_settlement_status
  FROM settlements WHERE id = NEW.settlement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found for commission link';
  END IF;
  IF NEW.party_type <> v_party_type OR NEW.party_id IS DISTINCT FROM v_party_id THEN
    RAISE EXCEPTION 'Commission link party does not match settlement';
  END IF;

  SELECT c.store_id, o.driver_id, o.status, o.delivered_at
    INTO v_store_id, v_driver_id, v_order_status, v_delivered_at
  FROM commissions c JOIN orders o ON o.id = c.order_id
  WHERE c.id = NEW.commission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found for settlement link';
  END IF;
  IF v_order_status <> 'delivered' OR v_delivered_at IS NULL
     OR v_delivered_at < (v_period_start::timestamp AT TIME ZONE 'Asia/Aden')
     OR v_delivered_at >= ((v_period_end + 1)::timestamp AT TIME ZONE 'Asia/Aden') THEN
    RAISE EXCEPTION 'Commission order is not delivered within the settlement Yemen local period';
  END IF;
  IF NEW.party_type = 'store' AND v_store_id <> v_party_id THEN
    RAISE EXCEPTION 'Commission store does not match settlement party';
  END IF;
  IF NEW.party_type = 'driver' AND (v_driver_id IS NULL OR v_driver_id <> v_party_id) THEN
    RAISE EXCEPTION 'Commission driver does not match settlement party';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_settlement_commission_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_settlement_party_type ledger_account_type;
  v_settlement_party_id uuid;
  v_period_start date;
  v_period_end date;
  v_settlement_status settlement_status;
  v_store_id uuid;
  v_driver_id uuid;
  v_store_amount numeric(14,2);
  v_driver_amount numeric(14,2);
  v_order_status order_status;
  v_delivered_at timestamptz;
  v_expected_amount numeric(14,2);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.settlement_id IS DISTINCT FROM OLD.settlement_id
       OR NEW.commission_id IS DISTINCT FROM OLD.commission_id
       OR NEW.party_type IS DISTINCT FROM OLD.party_type
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Settlement commission item identity is immutable';
    END IF;
    IF OLD.released_at IS NOT NULL OR NEW.released_at IS NULL THEN
      RAISE EXCEPTION 'Settlement commission item can only be released once';
    END IF;
    IF NEW.released_at IS NOT NULL AND v_settlement_status <> 'cancelled' THEN
      RAISE EXCEPTION 'Settlement commission item can only be released when the settlement is cancelled';
    END IF;
  END IF;

  SELECT party_type, party_id, period_start, period_end, status
    INTO v_settlement_party_type, v_settlement_party_id, v_period_start, v_period_end, v_settlement_status
  FROM settlements WHERE id = NEW.settlement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found for commission item';
  END IF;
  IF NEW.party_type <> v_settlement_party_type THEN
    RAISE EXCEPTION 'Commission item party type does not match settlement';
  END IF;

  SELECT c.store_id, o.driver_id, c.store_amount, c.driver_amount, o.status, o.delivered_at
    INTO v_store_id, v_driver_id, v_store_amount, v_driver_amount, v_order_status, v_delivered_at
  FROM commissions c JOIN orders o ON o.id = c.order_id
  WHERE c.id = NEW.commission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found for settlement item';
  END IF;
  IF v_order_status <> 'delivered' OR v_delivered_at IS NULL
     OR v_delivered_at < (v_period_start::timestamp AT TIME ZONE 'Asia/Aden')
     OR v_delivered_at >= ((v_period_end + 1)::timestamp AT TIME ZONE 'Asia/Aden') THEN
    RAISE EXCEPTION 'Commission order is not delivered within the settlement Yemen local period';
  END IF;

  IF NEW.party_type = 'store' THEN
    IF v_store_id IS DISTINCT FROM v_settlement_party_id THEN
      RAISE EXCEPTION 'Commission store does not match settlement party';
    END IF;
    v_expected_amount := v_store_amount;
  ELSE
    IF v_driver_id IS NULL OR v_driver_id IS DISTINCT FROM v_settlement_party_id THEN
      RAISE EXCEPTION 'Commission driver does not match settlement party';
    END IF;
    v_expected_amount := v_driver_amount;
  END IF;
  IF v_expected_amount <= 0 OR NEW.amount IS DISTINCT FROM v_expected_amount THEN
    RAISE EXCEPTION 'Settlement commission item amount does not match commission';
  END IF;
  RETURN NEW;
END;
$$;

-- Existing settlement status and payout ledger must agree before enforcing the database guard.
DO $
DECLARE
  invalid_settlement uuid;
BEGIN
  SELECT s.id INTO invalid_settlement
  FROM settlements s
  WHERE
    (s.status = 'paid' AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.settlement_id = s.id
        AND t.type = 'settlement_payout'
        AND t.direction = 'debit'
        AND t.account_type = s.party_type
        AND t.account_id = s.party_id
        AND t.amount = s.net_amount
        AND t.currency = s.currency
    ))
    OR (s.status <> 'paid' AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.settlement_id = s.id AND t.type = 'settlement_payout'
    ))
  LIMIT 1;

  IF invalid_settlement IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement % status does not match its payout ledger; manual reconciliation is required', invalid_settlement;
  END IF;

  SELECT s.id INTO invalid_settlement
  FROM settlements s
  LEFT JOIN settlement_commission_items item
    ON item.settlement_id = s.id AND item.released_at IS NULL
  WHERE s.status <> 'cancelled'
  GROUP BY s.id
  HAVING COALESCE(SUM(item.amount), 0) <> s.net_amount
  LIMIT 1;

  IF invalid_settlement IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement % net amount does not match its active commission reservations', invalid_settlement;
  END IF;
END $;

-- Correct legacy settlement totals: gross is pre-commission order value, net is the payable amount.
-- Keep all linked historical commissions and settlement payouts unchanged.
WITH settlement_totals AS (
  SELECT
    s.id,
    SUM(CASE WHEN s.party_type = 'store' THEN c.order_amount ELSE c.driver_amount END)::numeric(14,2) AS gross_amount,
    SUM(CASE WHEN s.party_type = 'store' THEN c.commission_amount ELSE 0 END)::numeric(14,2) AS commission_amount,
    SUM(CASE WHEN s.party_type = 'store' THEN c.store_amount ELSE c.driver_amount END)::numeric(14,2) AS net_amount
  FROM settlements s
  JOIN settlement_commissions sc ON sc.settlement_id = s.id
  JOIN commissions c ON c.id = sc.commission_id
  GROUP BY s.id, s.party_type
)
UPDATE settlements s
SET gross_amount = totals.gross_amount,
    commission_amount = totals.commission_amount,
    net_amount = totals.net_amount
FROM settlement_totals totals
WHERE s.id = totals.id
  AND (
    s.gross_amount IS DISTINCT FROM totals.gross_amount
    OR s.commission_amount IS DISTINCT FROM totals.commission_amount
    OR s.net_amount IS DISTINCT FROM totals.net_amount
  );

-- Settlement financial identity is immutable; status transitions follow the approved state machine.
CREATE OR REPLACE FUNCTION protect_settlement_financial_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.party_type IS DISTINCT FROM OLD.party_type
     OR NEW.party_id IS DISTINCT FROM OLD.party_id
     OR NEW.period_start IS DISTINCT FROM OLD.period_start
     OR NEW.period_end IS DISTINCT FROM OLD.period_end
     OR NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR (OLD.currency IS NOT NULL AND NEW.currency IS DISTINCT FROM OLD.currency) THEN
    RAISE EXCEPTION 'Settlement financial identity is immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'pending' AND NEW.status IN ('approved', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('paid', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid settlement status transition: % -> %', OLD.status, NEW.status;
  END IF;
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
     AND NOT (OLD.status = 'pending' AND NEW.status = 'approved' AND NEW.approved_by IS NOT NULL) THEN
    RAISE EXCEPTION 'Settlement approver can only be set during approval';
  END IF;
  IF NEW.settled_at IS DISTINCT FROM OLD.settled_at
     AND NOT (OLD.status = 'approved' AND NEW.status = 'paid' AND NEW.settled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Settlement paid timestamp can only be set during payout';
  END IF;
  IF NEW.status = 'approved' AND NEW.approved_by IS NULL THEN
    RAISE EXCEPTION 'Approved settlement requires an approver';
  END IF;
  IF NEW.status = 'paid' AND NEW.settled_at IS NULL THEN
    RAISE EXCEPTION 'Paid settlement requires a paid timestamp';
  END IF;
  IF NEW.status = 'paid' AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.settlement_id = NEW.id
      AND t.type = 'settlement_payout'
      AND t.direction = 'debit'
      AND t.account_type = NEW.party_type
      AND t.account_id = NEW.party_id
      AND t.amount = NEW.net_amount
      AND t.currency = NEW.currency
  ) THEN
    RAISE EXCEPTION 'Paid settlement requires a matching immutable payout ledger entry';
  END IF;
  IF NEW.status = 'cancelled' AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.settlement_id = NEW.id
      AND t.type = 'settlement_payout'
      AND t.direction = 'debit'
  ) THEN
    RAISE EXCEPTION 'A settlement with a payout cannot be cancelled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlements_protect_financial_identity ON settlements;
CREATE TRIGGER settlements_protect_financial_identity
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION protect_settlement_financial_identity();

DROP TRIGGER IF EXISTS settlements_append_only_delete ON settlements;
CREATE TRIGGER settlements_append_only_delete
  BEFORE DELETE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mutation();
