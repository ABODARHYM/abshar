-- 048: Product-scoped coupons. Existing category-scoped coupons are
-- translated to their current product membership without changing usage history.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS scope varchar(20) NOT NULL DEFAULT 'general';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_scope_check') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_scope_check
      CHECK (scope IN ('general', 'products'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupon_products (
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, product_id)
);

CREATE INDEX IF NOT EXISTS coupon_products_product_idx ON coupon_products(product_id);

-- Preserve the original intent of legacy category-bound coupons.
INSERT INTO coupon_products (coupon_id, product_id)
SELECT c.id, p.id
FROM coupons c
JOIN products p ON p.category_id = c.category_id AND p.store_id = c.store_id
WHERE c.category_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE coupons SET scope = 'products'
WHERE category_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM coupon_products cp WHERE cp.coupon_id = coupons.id
);
