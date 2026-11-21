-- 038: Preserve the real pre-coupon delivery fee without inventing historical values.
-- Migration 035 could only backfill the then-current customer fee. A zero or
-- contradictory value does not prove the original driver fee was zero.
ALTER TABLE orders
  ALTER COLUMN original_delivery_fee DROP NOT NULL,
  ALTER COLUMN original_delivery_fee DROP DEFAULT;

-- Historical values are unknown when the original fee is zero (including
-- zero/zero rows) or is lower than the customer-facing fee. This can happen
-- when older order creation paths relied on the column's DEFAULT 0.
-- Keep the historical customer fee and all commission/ledger amounts intact;
-- NULL means "not recoverable", not a replacement price.
UPDATE orders
SET original_delivery_fee = NULL
WHERE original_delivery_fee = 0
   OR original_delivery_fee < delivery_fee;

-- Fail this migration rather than allowing an invalid historical snapshot
-- to reach the stricter constraints introduced by migration 041.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM orders
    WHERE original_delivery_fee IS NOT NULL
      AND original_delivery_fee < delivery_fee
  ) THEN
    RAISE EXCEPTION 'Historical original delivery fee reconciliation is incomplete';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION require_original_delivery_fee_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.original_delivery_fee IS NULL THEN
    RAISE EXCEPTION 'original_delivery_fee is required for new orders';
  END IF;
  IF NEW.original_delivery_fee < 0 THEN
    RAISE EXCEPTION 'original_delivery_fee cannot be negative';
  END IF;
  IF NEW.original_delivery_fee < NEW.delivery_fee THEN
    RAISE EXCEPTION 'original_delivery_fee cannot be below customer delivery_fee';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_require_original_delivery_fee ON orders;
CREATE TRIGGER orders_require_original_delivery_fee
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION require_original_delivery_fee_on_new_order();
