import { checksumOf, MigrationFile, orderMigrationNames, planMigrations, stripOuterTransactionStatements } from './migration-utils';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const file = (name: string, sql = `-- ${name}`): MigrationFile => ({ name, sql, checksum: checksumOf(sql) });

describe('orderMigrationNames', () => {
  it('sorts by number and ignores non-sql files', () => {
    expect(orderMigrationNames(['002_b.sql', '001_a.sql', 'README.md'])).toEqual(['001_a.sql', '002_b.sql']);
  });

  it('rejects malformed names', () => {
    expect(() => orderMigrationNames(['1_bad.sql'])).toThrow(/Invalid migration file name/);
    expect(() => orderMigrationNames(['001_Bad-Name.sql'])).toThrow(/Invalid migration file name/);
  });

  it('rejects duplicate numbers', () => {
    expect(() => orderMigrationNames(['001_a.sql', '001_b.sql'])).toThrow(/Duplicate migration number/);
  });
});

describe('planMigrations', () => {
  it('returns everything as pending on an empty database', () => {
    const files = [file('001_a.sql'), file('002_b.sql')];
    expect(planMigrations(files, []).pending).toEqual(['001_a.sql', '002_b.sql']);
  });

  it('returns only the new migrations', () => {
    const a = file('001_a.sql');
    const files = [a, file('002_b.sql')];
    expect(planMigrations(files, [{ name: a.name, checksum: a.checksum }]).pending).toEqual(['002_b.sql']);
  });

  it('fails when an applied migration was edited', () => {
    const files = [file('001_a.sql', 'SELECT 2;')];
    expect(() => planMigrations(files, [{ name: '001_a.sql', checksum: checksumOf('SELECT 1;') }])).toThrow(/modified/);
  });

  it('fails when an applied migration file is missing', () => {
    expect(() => planMigrations([], [{ name: '001_a.sql', checksum: 'x' }])).toThrow(/missing/);
  });

  it('fails when a pending migration sorts before the last applied', () => {
    const b = file('002_b.sql');
    const files = [file('001_a.sql'), b];
    expect(() => planMigrations(files, [{ name: b.name, checksum: b.checksum }])).toThrow(/Renumber/);
  });
});


describe('stripOuterTransactionStatements', () => {
  it('removes a legacy outer wrapper so the runner owns the atomic transaction', () => {
    const sql = '-- legacy migration\n\nBEGIN;\nCREATE TABLE example (id integer);\nCOMMIT;\n';
    expect(stripOuterTransactionStatements(sql)).toBe('-- legacy migration\n\nCREATE TABLE example (id integer);\n');
  });

  it('leaves SQL without an outer wrapper unchanged', () => {
    const sql = 'CREATE TABLE example (id integer);\n';
    expect(stripOuterTransactionStatements(sql)).toBe(sql);
  });
});

describe('real migration files', () => {
  const dir = join(__dirname, 'migrations');
  const names = orderMigrationNames(readdirSync(dir));

  it('preserves applied migration 031 and appends forward-only finance, notification, delivery-fee, distance-tier, verified geography, route snapshot, and delivery coverage migrations', () => {
    const numbers = names.map((name) => Number(name.slice(0, 3)));
    expect(numbers.slice(0, 26)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(numbers.slice(26)).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]);
  });

  it('plans finance migrations after an already-applied 031 without out-of-order work', () => {
    const baseSql = readFileSync(join(dir, '031_store_applications.sql'), 'utf8');
    const base = file('031_store_applications.sql', baseSql);
    const forward = names
      .filter((name) => Number(name.slice(0, 3)) > 31)
      .map((name) => file(name, readFileSync(join(dir, name), 'utf8')));

    expect(planMigrations([base, ...forward], [{ name: base.name, checksum: base.checksum }]).pending)
      .toEqual(forward.map((migration) => migration.name));
  });

  it('normalizes the legacy 031 wrapper for execution without changing its source checksum', () => {
    const sql = readFileSync(join(dir, '031_store_applications.sql'), 'utf8');
    const normalized = stripOuterTransactionStatements(sql);
    expect(normalized).not.toMatch(/^\s*BEGIN\s*;\s*$/m);
    expect(normalized).not.toMatch(/^\s*COMMIT\s*;\s*$/m);
    expect(checksumOf(sql)).not.toBe(checksumOf(normalized));
  });


  it('reconciles only active commission links for non-cancelled settlements', () => {
    const sql = readFileSync(join(dir, '040_settlement_yemen_business_timezone.sql'), 'utf8');
    const totals = sql.slice(sql.indexOf('WITH settlement_totals AS'), sql.indexOf('-- Settlement financial identity'));
    expect(totals).toContain('sc.released_at IS NULL');
    expect(totals).toContain("WHERE s.status <> 'cancelled'");
  });

  it('audits settlement total corrections and preserves paid settlement records', () => {
    const sql = readFileSync(join(dir, '040_settlement_yemen_business_timezone.sql'), 'utf8');
    const auditInsert = sql.indexOf('INSERT INTO settlement_financial_reconciliation_audit');
    const settlementUpdate = sql.indexOf('UPDATE settlements s', auditInsert);
    const identityGuard = sql.indexOf('-- Settlement financial identity', settlementUpdate);

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS settlement_financial_reconciliation_audit');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON settlement_financial_reconciliation_audit');
    expect(auditInsert).toBeGreaterThan(-1);
    expect(settlementUpdate).toBeGreaterThan(auditInsert);
    const reconciliation = sql.slice(auditInsert, identityGuard);
    expect(reconciliation).toContain("s.status IN ('pending', 'approved')");
    expect(reconciliation).not.toContain("s.status = 'paid'");
  });

  it('contain every table required by the spec', () => {
    const all = names.map((n) => readFileSync(join(dir, n), 'utf8')).join('\n');
    const required = [
      'users', 'roles', 'permissions', 'user_roles', 'customers', 'drivers', 'stores', 'store_staff',
      'categories', 'products', 'product_variants', 'addresses', 'orders', 'order_items',
      'order_status_history', 'driver_assignments', 'driver_locations', 'notifications',
      'notification_preferences', 'coupons', 'coupon_usage', 'reviews', 'support_tickets',
      'support_messages', 'payments', 'transactions', 'commissions', 'settlements',
      'delivery_zones', 'banners', 'promotions', 'favorites', 'settings', 'audit_logs',
    ];
    for (const table of required) {
      expect(all).toMatch(new RegExp(`CREATE TABLE ${table}\\s*\\(`));
    }
  });

  it('define all 13 order states', () => {
    const sql = readFileSync(join(dir, '001_extensions_and_types.sql'), 'utf8');
    const states = [
      'pending', 'accepted', 'rejected', 'preparing', 'ready', 'driverAssigned', 'driverGoingToStore',
      'driverArrivedStore', 'pickedUp', 'driverGoingToCustomer', 'driverArrivedCustomer', 'delivered', 'cancelled',
    ];
    for (const s of states) expect(sql).toContain(`'${s}'`);
  });
});
