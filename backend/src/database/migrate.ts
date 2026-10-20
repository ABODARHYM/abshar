/**
 * Migration runner (SQL files). الاستخدام:
 *   node dist/database/migrate.js up       # يطبّق الهجرات المعلّقة
 *   node dist/database/migrate.js status   # يعرض الحالة بدون تغيير
 *
 * - كل هجرة داخل Transaction واحدة (تفشل كاملة أو تنجح كاملة).
 * - advisory lock يمنع تشغيل مثيلين بالتوازي.
 * - checksum يمنع تعديل هجرة مطبّقة.
 * ملاحظة: لا تستخدم ALTER TYPE ... ADD VALUE داخل نفس هجرة تستخدم القيمة الجديدة.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { AppliedMigration, MigrationFile, checksumOf, orderMigrationNames, planMigrations } from './migration-utils';

const LOCK_ID = 727_274; // ثابت لهذا المشروع
const MIGRATIONS_DIR = join(__dirname, 'migrations');

function loadFiles(): MigrationFile[] {
  const names = orderMigrationNames(readdirSync(MIGRATIONS_DIR));
  return names.map((name) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
    return { name, sql, checksum: checksumOf(sql) };
  });
}

async function run(command: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
  await client.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text PRIMARY KEY,
        checksum    char(64) NOT NULL,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )`);

    const files = loadFiles();
    const appliedRows = await client.query<AppliedMigration>(
      'SELECT name, checksum FROM schema_migrations ORDER BY name',
    );
    const plan = planMigrations(files, appliedRows.rows);

    if (command === 'status') {
      const appliedSet = new Set(appliedRows.rows.map((r) => r.name));
      for (const f of files) console.log(`${appliedSet.has(f.name) ? '[x]' : '[ ]'} ${f.name}`);
      console.log(`\n${appliedSet.size} applied, ${plan.pending.length} pending`);
      return;
    }

    if (plan.pending.length === 0) {
      console.log('Database is up to date. Nothing to apply.');
      return;
    }

    for (const name of plan.pending) {
      const file = files.find((f) => f.name === name) as MigrationFile;
      console.log(`Applying ${name} ...`);
      try {
        await client.query('BEGIN');
        await client.query(file.sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file.name, file.checksum]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed and was rolled back: ${(error as Error).message}`);
      }
    }
    console.log(`Applied ${plan.pending.length} migration(s).`);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    } finally {
      await client.end();
    }
  }
}

const command = process.argv[2] ?? 'up';
if (command !== 'up' && command !== 'status') {
  console.error(`Unknown command "${command}". Use: up | status`);
  process.exit(2);
}

run(command).catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
