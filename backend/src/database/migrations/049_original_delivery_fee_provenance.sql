-- Distinguish verified original delivery fees from legacy backfill placeholders.
-- Existing orders remain FALSE: migration 035 could only copy delivery_fee,
-- which is not authoritative for historical free-delivery coupon orders.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS original_delivery_fee_verified boolean NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN orders.original_delivery_fee_verified IS
  'TRUE only when original_delivery_fee was captured from the authoritative pre-discount pricing calculation; legacy values remain unverified.';
