-- 038: Preserve the real pre-coupon delivery fee without inventing historical values.
-- Migration 035 could only backfill the current fee. A zero fee does not prove the
-- original fee was zero (free-delivery coupons already reduced it to zero).
ALTER TABLE orders
  ALTER COLUMN original_delivery_fee DROP NOT NULL,
  ALTER COLUMN original_delivery_fee DROP DEFAULT;

-- Historical zero-fee orders are ambiguous; keep the original fee explicitly unknown.
UPDATE orders
SET original_delivery_fee = NULL
WHERE delivery_fee = 0;

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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_require_original_delivery_fee ON orders;
CREATE TRIGGER orders_require_original_delivery_fee
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION require_original_delivery_fee_on_new_order();
