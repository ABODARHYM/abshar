import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';

export interface CashSummaryRow {
  total_collected: string;
  total_submitted: string;
  total_earnings: string;
}

export interface CashTransactionRow {
  id: string;
  type: string;
  direction: string;
  amount: string | number;
  currency: string;
  description: string | null;
  order_id: string | null;
  order_number: string | null;
  settlement_id: string | null;
  created_at: Date;
}

export interface OutstandingDriverRow {
  driver_id: string;
  full_name: string;
  phone: string | null;
  outstanding_cash: string;
  total_earnings: string;
  last_collection_at: Date | null;
}

@Injectable()
export class DriverCashRepository {
  constructor(private readonly db: DatabaseService) {}

  /** Keep transaction and pool queries behind one compatible signature. */
  private queryWithClient<T extends QueryResultRow = QueryResultRow>(
    client: PoolClient | undefined,
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (client) return client.query<T>(text, params);
    return this.db.query<T>(text, params);
  }

  /**
   * ملخص العهدة للمندوب.
   */
  async getSummary(driverId: string, currency: string): Promise<CashSummaryRow> {
    const r = await this.db.query<CashSummaryRow>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'cod_collection' AND direction = 'credit' THEN amount ELSE 0 END), 0)::text AS total_collected,
        COALESCE(SUM(CASE WHEN direction = 'debit' AND (type = 'cash_remittance' OR (type = 'settlement_payout' AND settlement_id IS NULL)) THEN amount ELSE 0 END), 0)::text AS total_submitted,
        COALESCE(SUM(CASE WHEN type = 'driver_earning' AND direction = 'credit' THEN amount ELSE 0 END), 0)::text AS total_earnings
      FROM transactions
      WHERE account_type = 'driver' AND account_id = $1 AND currency = $2
      `,
      [driverId, currency],
    );
    return r.rows[0];
  }

  async getCurrency(): Promise<string> {
    const r = await this.db.query<{ value: any }>(
      `SELECT value FROM settings WHERE key = 'currency' LIMIT 1`,
    );
    const v = r.rows[0]?.value;
    if (typeof v === 'string') return v;
    return 'YER';
  }

  async listTransactions(
    driverId: string,
    query: { page: number; limit: number },
  ): Promise<{ rows: CashTransactionRow[]; total: number }> {
    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM transactions WHERE account_type = 'driver' AND account_id = $1`,
      [driverId],
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query<CashTransactionRow>(
      `
      SELECT
        t.id::text,
        t.type,
        t.direction,
        t.amount,
        t.currency,
        t.description,
        t.order_id,
        o.order_number,
        t.settlement_id,
        t.created_at
      FROM transactions t
      LEFT JOIN orders o ON o.id = t.order_id
      WHERE t.account_type = 'driver' AND t.account_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [driverId, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  /**
   * سجّل cash collection (عند تسليم COD).
   * يستدعيه DriverService.
   */
  async recordCashCollection(
    client: PoolClient | undefined,
    params: {
      driverId: string;
      orderId: string;
      amount: number;
      currency: string;
    },
  ): Promise<void> {
    const existing = await this.queryWithClient<{
      account_type: string;
      account_id: string | null;
      direction: string;
      amount: string;
      currency: string;
    }>(
      client,
      `SELECT account_type, account_id, direction, amount::text, currency
       FROM transactions WHERE order_id = $1 AND type = 'cod_collection' LIMIT 1`,
      [params.orderId],
    );
    if (existing.rows.length > 0) {
      const collection = existing.rows[0];
      if (
        collection.account_type !== 'driver' ||
        collection.account_id !== params.driverId ||
        collection.direction !== 'credit' ||
        Number(collection.amount) !== params.amount ||
        collection.currency?.trim() !== params.currency.trim()
      ) {
        throw new ConflictException('An existing COD collection conflicts with the delivered order');
      }
    } else {
      await this.queryWithClient(
        client,
        `
        INSERT INTO transactions (
          order_id, account_type, account_id, type, direction, amount, currency, description, created_by, idempotency_key
        )
        VALUES ($1, 'driver', $2, 'cod_collection', 'credit', $3, $4, 'Cash on delivery collected', $2, $5)
        `,
        [params.orderId, params.driverId, params.amount, params.currency, `order:${params.orderId}:driver:cod_collection:credit`],
      );
    }

    await this.queryWithClient(
      client,
      `
      UPDATE orders
      SET cash_collected_amount = $1, cash_collected_at = now()
      WHERE id = $2
      `,
      [params.amount, params.orderId],
    );
  }

  /**
   * سجّل driver_earning (عند التسليم).
   */
  async recordDriverEarning(
    client: PoolClient | undefined,
    params: {
      driverId: string;
      orderId: string;
      amount: number;
      currency: string;
    },
  ): Promise<void> {
    const existing = await this.queryWithClient<{
      account_type: string;
      account_id: string | null;
      direction: string;
      amount: string;
      currency: string;
    }>(
      client,
      `SELECT account_type, account_id, direction, amount::text, currency
       FROM transactions WHERE order_id = $1 AND type = 'driver_earning' LIMIT 1`,
      [params.orderId],
    );
    if (existing.rows.length > 0) {
      const earning = existing.rows[0];
      if (
        earning.account_type !== 'driver' ||
        earning.account_id !== params.driverId ||
        earning.direction !== 'credit' ||
        Number(earning.amount) !== params.amount ||
        earning.currency?.trim() !== params.currency.trim()
      ) {
        throw new ConflictException('An existing driver earning conflicts with the delivered order');
      }
      return;
    }

    await this.queryWithClient(
      client,
      `
      INSERT INTO transactions (
        order_id, account_type, account_id, type, direction, amount, currency, description, created_by, idempotency_key
      )
      VALUES ($1, 'driver', $2, 'driver_earning', 'credit', $3, $4, 'Driver earning', $2,
        'order:' || $1::text || ':driver:driver_earning:credit')
      `,
      [params.orderId, params.driverId, params.amount, params.currency],
    );
  }

  /**
   * تسليم نقد من المندوب للمنصة.
   */
  async submitCash(
    driverId: string,
    amount: number,
    note: string | null,
    currency: string,
  ): Promise<{ transactionId: string }> {
    return this.db.transaction(async (client: PoolClient) => {
      // Serialize handovers for this driver so concurrent requests cannot over-submit.
      const driver = await client.query(
        `SELECT user_id FROM drivers WHERE user_id = $1 FOR UPDATE`,
        [driverId],
      );
      if (driver.rowCount === 0) {
        throw new BadRequestException('Driver account was not found');
      }

      const balance = await client.query<{ outstanding: string }>(
        `
        SELECT COALESCE(SUM(CASE
          WHEN type = 'cod_collection' AND direction = 'credit' THEN amount
          WHEN type = 'cash_remittance' AND direction = 'debit' THEN -amount
          WHEN type = 'settlement_payout' AND direction = 'debit' AND settlement_id IS NULL THEN -amount
          ELSE 0
        END), 0)::text AS outstanding
        FROM transactions
        WHERE account_type = 'driver' AND account_id = $1 AND currency = $2
        `,
        [driverId, currency],
      );
      const outstanding = Number(balance.rows[0]?.outstanding ?? 0);
      if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
        throw new BadRequestException(
          `Cash submission exceeds the current outstanding balance (${outstanding})`,
        );
      }

      const result = await client.query<{ id: string }>(
        `
        INSERT INTO transactions (
          account_type, account_id, type, direction, amount, currency, description, created_by
        )
        VALUES ('driver', $1, 'cash_remittance', 'debit', $2, $3, $4, $1)
        RETURNING id::text
        `,
        [driverId, amount, currency, note ?? 'Cash submission'],
      );
      return { transactionId: result.rows[0].id };
    });
  }

  /**
   * إداري: تعديل يدوي.
   */
  async adjust(
    actorId: string,
    driverId: string,
    amount: number,
    reason: string,
    currency: string,
  ): Promise<{ transactionId: string }> {
    const direction = amount >= 0 ? 'credit' : 'debit';
    const absAmount = Math.abs(amount);

    const r = await this.db.query<{ id: string }>(
      `
      INSERT INTO transactions (
        account_type, account_id, type, direction, amount, currency, description, created_by
      )
      VALUES ('driver', $1, 'adjustment', $2, $3, $4, $5, $6)
      RETURNING id::text
      `,
      [driverId, direction, absAmount, currency, reason, actorId],
    );
    return { transactionId: r.rows[0].id };
  }

  /**
   * Admin: قائمة المندوبين مع العهدة المعلّقة.
   */
  async listOutstandingDrivers(query: {
    page: number;
    limit: number;
  }, currency: string): Promise<{ rows: OutstandingDriverRow[]; total: number }> {
    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(DISTINCT d.user_id)::text AS count FROM drivers d WHERE d.status = 'active'`,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query<OutstandingDriverRow>(
      `
      SELECT
        d.user_id AS driver_id,
        u.full_name,
        u.phone,
        COALESCE(SUM(CASE
          WHEN t.type = 'cod_collection' AND t.direction = 'credit' THEN t.amount
          WHEN t.type = 'cash_remittance' AND t.direction = 'debit' THEN -t.amount
          WHEN t.type = 'settlement_payout' AND t.direction = 'debit' AND t.settlement_id IS NULL THEN -t.amount
          ELSE 0
        END), 0)::text AS outstanding_cash,
        COALESCE(SUM(CASE
          WHEN t.type = 'driver_earning' AND t.direction = 'credit' THEN t.amount
          ELSE 0
        END), 0)::text AS total_earnings,
        MAX(CASE WHEN t.type = 'cod_collection' THEN t.created_at END) AS last_collection_at
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN transactions t ON t.account_type = 'driver' AND t.account_id = d.user_id AND t.currency = $3
      WHERE d.status = 'active'
      GROUP BY d.user_id, u.full_name, u.phone
      ORDER BY outstanding_cash DESC
      LIMIT $1 OFFSET $2
      `,
      [query.limit, offset, currency],
    );

    return { rows: rowsRes.rows, total };
  }
}
