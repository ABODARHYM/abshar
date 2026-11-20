-- 039: Protect settlement commission reservations as an immutable financial audit trail.
CREATE OR REPLACE FUNCTION validate_settlement_commission_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_settlement_party_type ledger_account_type;
  v_settlement_party_id uuid;
  v_store_id uuid;
  v_driver_id uuid;
  v_store_amount numeric(14,2);
  v_driver_amount numeric(14,2);
  v_order_status order_status;
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

  SELECT party_type, party_id
    INTO v_settlement_party_type, v_settlement_party_id
  FROM settlements
  WHERE id = NEW.settlement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found for commission item';
  END IF;

  IF NEW.party_type <> v_settlement_party_type THEN
    RAISE EXCEPTION 'Commission item party type does not match settlement';
  END IF;

  SELECT c.store_id, o.driver_id, c.store_amount, c.driver_amount, o.status
    INTO v_store_id, v_driver_id, v_store_amount, v_driver_amount, v_order_status
  FROM commissions c
  JOIN orders o ON o.id = c.order_id
  WHERE c.id = NEW.commission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found for settlement item';
  END IF;

  IF v_order_status <> 'delivered' THEN
    RAISE EXCEPTION 'Only delivered-order commissions can be settled';
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

DROP TRIGGER IF EXISTS settlement_commission_items_validate ON settlement_commission_items;
CREATE TRIGGER settlement_commission_items_validate
  BEFORE INSERT OR UPDATE ON settlement_commission_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_settlement_commission_item();

DROP TRIGGER IF EXISTS settlement_commission_items_append_only ON settlement_commission_items;
CREATE TRIGGER settlement_commission_items_append_only
  BEFORE DELETE ON settlement_commission_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mutation();
