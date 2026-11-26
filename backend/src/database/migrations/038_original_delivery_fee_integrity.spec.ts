import { readFileSync } from 'fs';
import { join } from 'path';

describe('038 original delivery fee historical reconciliation', () => {
  const sql = readFileSync(join(__dirname, '038_original_delivery_fee_integrity.sql'), 'utf8');

  it('marks zero and below-customer historical original fees as unknown', () => {
    const update = sql.match(/UPDATE orders([\s\S]*?);/i)?.[0] ?? '';
    expect(update).toMatch(/SET\s+original_delivery_fee\s*=\s*NULL/i);
    expect(update).toMatch(/original_delivery_fee\s*=\s*0/i);
    expect(update).toMatch(/original_delivery_fee\s*<\s*delivery_fee/i);
  });

  it('fails closed if an invalid non-null historical fee remains', () => {
    expect(sql).toMatch(/IF EXISTS\s*\([\s\S]*?original_delivery_fee\s+IS NOT NULL[\s\S]*?original_delivery_fee\s*<\s*delivery_fee[\s\S]*?\)[\s\S]*?RAISE EXCEPTION/i);
  });

  it('requires new order snapshots to be nonnegative and not below the customer fee', () => {
    expect(sql).toMatch(/NEW\.original_delivery_fee\s+IS NULL/i);
    expect(sql).toMatch(/NEW\.original_delivery_fee\s*<\s*0/i);
    expect(sql).toMatch(/NEW\.original_delivery_fee\s*<\s*NEW\.delivery_fee/i);
  });
});
