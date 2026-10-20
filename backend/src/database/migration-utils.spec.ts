import { checksumOf, MigrationFile, orderMigrationNames, planMigrations } from './migration-utils';
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

describe('real migration files', () => {
  const dir = join(__dirname, 'migrations');
  const names = orderMigrationNames(readdirSync(dir));

  it('are numbered contiguously from 001', () => {
    names.forEach((name, i) => expect(name.startsWith(String(i + 1).padStart(3, '0'))).toBe(true));
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
