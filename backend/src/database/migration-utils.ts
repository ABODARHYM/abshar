import { createHash } from 'crypto';

export const MIGRATION_FILE_PATTERN = /^(\d{3,})_[a-z0-9_]+\.sql$/;

export interface MigrationFile {
  name: string;
  sql: string;
  checksum: string;
}

export function checksumOf(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/** يرتّب ملفات الهجرة بالاسم ويتحقق من الصيغة وعدم تكرار الرقم. */
export function orderMigrationNames(names: string[]): string[] {
  const sqlFiles = names.filter((n) => n.endsWith('.sql'));
  const seen = new Map<string, string>();
  for (const name of sqlFiles) {
    const match = MIGRATION_FILE_PATTERN.exec(name);
    if (!match) {
      throw new Error(`Invalid migration file name "${name}". Expected NNN_description.sql (lowercase, digits, underscores).`);
    }
    const prefix = match[1];
    const existing = seen.get(prefix);
    if (existing) {
      throw new Error(`Duplicate migration number ${prefix}: "${existing}" and "${name}".`);
    }
    seen.set(prefix, name);
  }
  return [...sqlFiles].sort((a, b) => a.localeCompare(b, 'en'));
}

export interface AppliedMigration {
  name: string;
  checksum: string;
}

export interface MigrationPlan {
  pending: string[];
}

/**
 * يقارن الملفات الموجودة بما طُبِّق. يرفض:
 *  - تعديل ملف هجرة طُبِّق سابقًا (checksum مختلف)
 *  - هجرة طُبِّقت ولم يعد ملفها موجودًا
 *  - هجرة جديدة رقمها أقدم من آخر هجرة مطبّقة (ترتيب مكسور)
 */
export function planMigrations(files: MigrationFile[], applied: AppliedMigration[]): MigrationPlan {
  const fileByName = new Map(files.map((f) => [f.name, f]));

  for (const a of applied) {
    const file = fileByName.get(a.name);
    if (!file) {
      throw new Error(`Migration "${a.name}" was applied to the database but its file is missing.`);
    }
    if (file.checksum !== a.checksum) {
      throw new Error(
        `Migration "${a.name}" was modified after being applied. Never edit applied migrations; create a new one.`,
      );
    }
  }

  const appliedNames = new Set(applied.map((a) => a.name));
  const pending = files.filter((f) => !appliedNames.has(f.name)).map((f) => f.name);

  if (applied.length > 0 && pending.length > 0) {
    const lastApplied = [...appliedNames].sort((a, b) => a.localeCompare(b, 'en')).pop() as string;
    const outOfOrder = pending.filter((p) => p.localeCompare(lastApplied, 'en') < 0);
    if (outOfOrder.length > 0) {
      throw new Error(
        `Pending migration(s) ${outOfOrder.join(', ')} sort before the last applied "${lastApplied}". Renumber them.`,
      );
    }
  }

  return { pending };
}
