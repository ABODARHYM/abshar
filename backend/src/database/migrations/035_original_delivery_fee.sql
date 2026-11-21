ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS original_delivery_fee numeric(12,2);

-- Historical original fees cannot be reconstructed from delivery_fee
-- for orders whose free-delivery coupon already set delivery_fee to zero.
UPDATE orders
SET original_delivery_fee = delivery_fee
WHERE original_delivery_fee IS NULL;

ALTER TABLE orders
  ALTER COLUMN original_delivery_fee SET DEFAULT 0,
  ALTER COLUMN original_delivery_fee SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_original_delivery_fee_nonnegative'
      AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_original_delivery_fee_nonnegative
      CHECK (original_delivery_fee >= 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE orders VALIDATE CONSTRAINT orders_original_delivery_fee_nonnegative;
