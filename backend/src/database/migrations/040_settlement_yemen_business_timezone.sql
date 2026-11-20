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
    LEFT JOIN settlement_commission_items item
      ON item.settlement_id = legacy.settlement_id
     AND item.commission_id = legacy.commission_id
     AND item.party_type = legacy.party_type
     AND item.released_at IS NULL
    WHERE legacy.released_at IS NULL AND item.commission_id IS NULL
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
  END IF;

  SELECT party_type, party_id, period_start, period_end
    INTO v_party_type, v_party_id, v_period_start, v_period_end
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
  END IF;

  SELECT party_type, party_id, period_start, period_end
    INTO v_settlement_party_type, v_settlement_party_id, v_period_start, v_period_end
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
