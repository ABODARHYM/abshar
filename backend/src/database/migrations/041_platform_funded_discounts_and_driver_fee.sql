-- 041: Make platform-funded discounts and original driver delivery fees explicit.
-- Existing historical free-delivery orders with unknown original fees remain NULL and unchanged.
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS original_delivery_fee numeric(12,2);

UPDATE commissions c
SET original_delivery_fee = o.original_delivery_fee
FROM orders o
WHERE o.id = c.order_id
  AND c.original_delivery_fee IS NULL
  AND o.original_delivery_fee IS NOT NULL;

ALTER TABLE commissions
  ADD CONSTRAINT commissions_original_delivery_fee_nonnegative_check
  CHECK (original_delivery_fee IS NULL OR original_delivery_fee >= 0) NOT VALID;
ALTER TABLE commissions
  VALIDATE CONSTRAINT commissions_original_delivery_fee_nonnegative_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_original_delivery_fee_not_below_customer_fee_check
  CHECK (original_delivery_fee IS NULL OR original_delivery_fee >= delivery_fee) NOT VALID;
ALTER TABLE orders
  VALIDATE CONSTRAINT orders_original_delivery_fee_not_below_customer_fee_check;

-- Historical rows without a recoverable original fee retain their previous driver amount.
-- New rows use the original delivery fee when available.
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_financial_equations_check;
ALTER TABLE commissions
  ADD CONSTRAINT commissions_financial_equations_check
  CHECK (
    store_amount + commission_amount = order_amount
    AND platform_amount = commission_amount
    AND driver_amount = COALESCE(original_delivery_fee, delivery_fee)
  ) NOT VALID;
ALTER TABLE commissions
  VALIDATE CONSTRAINT commissions_financial_equations_check;

CREATE OR REPLACE FUNCTION validate_commission_order_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_store_id uuid;
  v_subtotal numeric(12,2);
  v_delivery_fee numeric(12,2);
  v_original_delivery_fee numeric(12,2);
  v_discount_total numeric(12,2);
  v_order_status order_status;
BEGIN
  SELECT store_id, subtotal, delivery_fee, original_delivery_fee, discount_total, status
    INTO v_store_id, v_subtotal, v_delivery_fee, v_original_delivery_fee, v_discount_total, v_order_status
  FROM orders
  WHERE id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission order does not exist';
  END IF;
  IF v_order_status <> 'delivered' THEN
    RAISE EXCEPTION 'Commission can only be created for a delivered order';
  END IF;
  IF v_original_delivery_fee IS NULL THEN
    RAISE EXCEPTION 'Original delivery fee is unknown; commission requires manual reconciliation';
  END IF;
  IF NEW.store_id IS DISTINCT FROM v_store_id
     OR NEW.order_amount IS DISTINCT FROM v_subtotal
     OR NEW.delivery_fee IS DISTINCT FROM v_delivery_fee
     OR NEW.original_delivery_fee IS DISTINCT FROM v_original_delivery_fee
     OR NEW.discount_amount IS DISTINCT FROM v_discount_total
     OR NEW.driver_amount IS DISTINCT FROM v_original_delivery_fee THEN
    RAISE EXCEPTION 'Commission values do not match the delivered order snapshot';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commissions_validate_order_snapshot ON commissions;
CREATE TRIGGER commissions_validate_order_snapshot
  BEFORE INSERT ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_commission_order_snapshot();
