-- 032: finance integrity. Never edits prior migrations or changes historical ledger rows.
-- If existing duplicate ledger rows prevent unique indexes, this migration aborts atomically.

CREATE TABLE settlement_commissions (
  settlement_id uuid NOT NULL REFERENCES settlements(id) ON DELETE RESTRICT,
  commission_id uuid NOT NULL REFERENCES commissions(id) ON DELETE RESTRICT,
  party_type ledger_account_type NOT NULL CHECK (party_type IN ('store', 'driver')),
  party_id uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  PRIMARY KEY (settlement_id, commission_id, party_type)
);
CREATE UNIQUE INDEX settlement_commissions_one_active_per_commission_party
  ON settlement_commissions (commission_id, party_type)
  WHERE released_at IS NULL;

-- Ensure each commission link belongs to the same settlement party.
CREATE OR REPLACE FUNCTION validate_settlement_commission_party()
RETURNS trigger AS $$
DECLARE
  v_party_type ledger_account_type;
  v_party_id uuid;
  v_store_id uuid;
  v_driver_id uuid;
BEGIN
  -- A reservation's identity is immutable after creation.
  -- The only permitted update is releasing it once.
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

  SELECT party_type, party_id
    INTO v_party_type, v_party_id
  FROM settlements
  WHERE id = NEW.settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found for commission link';
  END IF;

  IF NEW.party_type <> v_party_type THEN
    RAISE EXCEPTION 'Commission link party type does not match settlement';
  END IF;

  IF NEW.party_id IS DISTINCT FROM v_party_id THEN
    RAISE EXCEPTION 'Commission link party id does not match settlement';
  END IF;

  SELECT c.store_id, o.driver_id
    INTO v_store_id, v_driver_id
  FROM commissions c
  JOIN orders o ON o.id = c.order_id
  WHERE c.id = NEW.commission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found for settlement link';
  END IF;

  IF NEW.party_type = 'store' AND v_store_id <> v_party_id THEN
    RAISE EXCEPTION 'Commission store does not match settlement party';
  END IF;

  IF NEW.party_type = 'driver'
     AND (v_driver_id IS NULL OR v_driver_id <> v_party_id) THEN
    RAISE EXCEPTION 'Commission driver does not match settlement party';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_commissions_validate_party
  BEFORE INSERT OR UPDATE ON settlement_commissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_settlement_commission_party();

CREATE TRIGGER settlement_commissions_append_only
  BEFORE DELETE ON settlement_commissions FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TABLE settlement_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_id uuid NOT NULL REFERENCES settlements(id) ON DELETE RESTRICT,
  from_status settlement_status,
  to_status settlement_status NOT NULL,
  actor_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlement_events_settlement_idx ON settlement_events (settlement_id, created_at);
CREATE TRIGGER settlement_events_append_only
  BEFORE UPDATE OR DELETE ON settlement_events FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- Backfill only legacy settlements whose old totals exactly identify the rows.
-- Historical implementation used store_amount for store gross/net and driver_amount
-- for driver gross/net, while commission_amount was summed for both party types.
INSERT INTO settlement_commissions (settlement_id, party_type, party_id, commission_id)
SELECT s.id, s.party_type, s.party_id, c.id
FROM settlements s
JOIN commissions c ON TRUE
JOIN orders o ON o.id = c.order_id
WHERE s.status <> 'cancelled'
  AND o.status = 'delivered'
  AND o.delivered_at >= s.period_start
  AND o.delivered_at < (s.period_end + INTERVAL '1 day')
  AND ((s.party_type = 'store' AND c.store_id = s.party_id)
    OR (s.party_type = 'driver' AND o.driver_id = s.party_id))
  AND EXISTS (
    SELECT 1
    FROM commissions c2 JOIN orders o2 ON o2.id = c2.order_id
    WHERE o2.status = 'delivered'
      AND o2.delivered_at >= s.period_start
      AND o2.delivered_at < (s.period_end + INTERVAL '1 day')
      AND ((s.party_type = 'store' AND c2.store_id = s.party_id)
        OR (s.party_type = 'driver' AND o2.driver_id = s.party_id))
    HAVING
      (CASE WHEN s.party_type = 'store' THEN COALESCE(SUM(c2.store_amount),0)
            ELSE COALESCE(SUM(c2.driver_amount),0) END) = s.gross_amount
      AND (CASE WHEN s.party_type = 'store' THEN COALESCE(SUM(c2.commission_amount),0)
                ELSE COALESCE(SUM(c2.commission_amount),0) END) = s.commission_amount
      AND (CASE WHEN s.party_type = 'store' THEN COALESCE(SUM(c2.store_amount),0)
                ELSE COALESCE(SUM(c2.driver_amount),0) END) = s.net_amount
  );

DO $$
DECLARE bad_settlement uuid;
BEGIN
  SELECT s.id INTO bad_settlement
  FROM settlements s
  WHERE s.status <> 'cancelled'
    AND EXISTS (
      SELECT 1 FROM commissions c JOIN orders o ON o.id = c.order_id
      WHERE o.status = 'delivered'
        AND o.delivered_at >= s.period_start
        AND o.delivered_at < (s.period_end + INTERVAL '1 day')
        AND ((s.party_type = 'store' AND c.store_id = s.party_id)
          OR (s.party_type = 'driver' AND o.driver_id = s.party_id))
    )
    AND NOT EXISTS (SELECT 1 FROM settlement_commissions sc WHERE sc.settlement_id = s.id)
  LIMIT 1;
  IF bad_settlement IS NOT NULL THEN
    RAISE EXCEPTION 'Finance migration stopped: legacy settlement % cannot be mapped unambiguously by exact historical totals; review scripts/finance-duplicate-audit.sql and map manually', bad_settlement;
  END IF;
END $$;

-- Validate stored commission equations without rewriting any historical amount.
DO $$
DECLARE invalid_order uuid;
BEGIN
  SELECT order_id INTO invalid_order FROM commissions
  WHERE store_amount + commission_amount <> order_amount
     OR platform_amount <> commission_amount
     OR driver_amount <> delivery_fee
  LIMIT 1;
  IF invalid_order IS NOT NULL THEN
    RAISE EXCEPTION 'Finance migration stopped: commission equations need manual review for order %', invalid_order;
  END IF;
END $$;
ALTER TABLE commissions
  ADD CONSTRAINT commissions_financial_equations_check
  CHECK (store_amount + commission_amount = order_amount
     AND platform_amount = commission_amount
     AND driver_amount = delivery_fee) NOT VALID;
ALTER TABLE commissions VALIDATE CONSTRAINT commissions_financial_equations_check;

-- Report and stop before constraints if duplicate order-ledger records already exist.
DO $$
DECLARE duplicate_description text;
BEGIN
  SELECT string_agg(type || ':' || order_id::text || '=' || row_count::text, '; ')
    INTO duplicate_description
  FROM (
    SELECT type, order_id, COUNT(*) AS row_count
    FROM transactions
    WHERE order_id IS NOT NULL
      AND type IN ('cod_collection', 'store_earning', 'commission')
    GROUP BY type, order_id HAVING COUNT(*) > 1
  ) duplicates;
  IF duplicate_description IS NOT NULL THEN
    RAISE EXCEPTION 'Finance migration stopped: duplicate order ledger entries require manual review: %', duplicate_description;
  END IF;
END $$;

CREATE UNIQUE INDEX transactions_one_cod_collection_per_order
  ON transactions (order_id) WHERE order_id IS NOT NULL AND type = 'cod_collection';
-- Preserve historical driver_earning rows unchanged.
-- Only newly guarded rows participate in the unique index.
ALTER TABLE transactions
  ADD COLUMN driver_earning_guard boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION guard_driver_earning_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  locked_order_id uuid;
BEGIN
  IF NEW.type <> 'driver_earning' THEN
    RETURN NEW;
  END IF;

  IF NEW.order_id IS NULL THEN
    RAISE EXCEPTION 'driver_earning requires a valid order_id';
  END IF;

  -- Serialize all driver-earning inserts for the same order.
  SELECT id
    INTO locked_order_id
  FROM orders
  WHERE id = NEW.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver_earning order does not exist: %', NEW.order_id;
  END IF;

  -- Do not create a new earning if any historical or current
  -- driver_earning already exists for this order.
  IF EXISTS (
    SELECT 1
    FROM transactions
    WHERE order_id = NEW.order_id
      AND type = 'driver_earning'
  ) THEN
    RAISE EXCEPTION 'driver_earning already exists for order %', NEW.order_id;
  END IF;

  NEW.driver_earning_guard := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_guard_driver_earning_insert
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.type = 'driver_earning')
  EXECUTE FUNCTION guard_driver_earning_insert();

CREATE UNIQUE INDEX transactions_one_guarded_driver_earning_per_order
  ON transactions (order_id)
  WHERE order_id IS NOT NULL
    AND type = 'driver_earning'
    AND driver_earning_guard IS TRUE;
CREATE UNIQUE INDEX transactions_one_store_earning_per_order
  ON transactions (order_id) WHERE order_id IS NOT NULL AND type = 'store_earning';
CREATE UNIQUE INDEX transactions_one_platform_commission_per_order
  ON transactions (order_id) WHERE order_id IS NOT NULL AND type = 'commission';
