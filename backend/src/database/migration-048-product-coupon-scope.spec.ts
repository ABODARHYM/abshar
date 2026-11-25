import { readFileSync } from 'fs';
import { join } from 'path';

describe('048 product-scoped coupon migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '048_product_specific_coupons.sql'),
    'utf8',
  );

  it('preserves category targeting even when the category has no matching products', () => {
    const update = sql.slice(sql.indexOf('UPDATE coupons SET scope'));
    expect(update).toMatch(/WHERE category_id IS NOT NULL\s*;/);
    expect(update).not.toMatch(/EXISTS\s*\(/i);
  });

  it('copies matching category products without changing historical coupon usage', () => {
    expect(sql).toContain('INSERT INTO coupon_products (coupon_id, product_id)');
    expect(sql).toContain('p.category_id = c.category_id');
    expect(sql).toContain('c.store_id IS NULL OR p.store_id = c.store_id');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(sql).not.toMatch(/DELETE\s+FROM\s+coupon_usage/i);
    expect(sql).not.toMatch(/UPDATE\s+coupon_usage/i);
  });
});
