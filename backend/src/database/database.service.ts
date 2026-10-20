import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { AppConfigService } from '../config/app-config.service';

/**
 * طبقة الوصول الوحيدة إلى PostgreSQL.
 * - كل الاستعلامات parameterized ($1, $2...) => حماية من SQL Injection.
 * - Connection Pooling عبر pg.Pool.
 * - Transactions عبر transaction().
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: AppConfigService) {
    const db = config.all.database;
    this.pool = new Pool({
      connectionString: db.url,
      max: db.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
      application_name: 'absher-bi-backend',
      ssl: db.ssl ? { rejectUnauthorized: true } : undefined,
    });
    // خطأ على اتصال خامل لا يجب أن يُسقط العملية
    this.pool.on('error', (err) => this.logger.error(`Idle PostgreSQL client error: ${err.message}`));
  }

  query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        this.logger.error(`ROLLBACK failed: ${(rollbackError as Error).message}`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /** فحص الجاهزية: يرجع true إذا كانت القاعدة تستجيب. */
  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.warn(`Database ping failed: ${(error as Error).message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
