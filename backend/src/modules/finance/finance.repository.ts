import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';

@Injectable()
export class FinanceRepository {
  constructor(private readonly db: DatabaseService) {}

  // ═══════════════ Generic Query ═══════════════

  async query<T extends import('pg').QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    const r = await this.db.query<T>(sql, params);
    return { rows: r.rows };
  }

  // ═══════════════ Store Earnings ═══════════════

  async getStoreEarnings(storeId: string): Promise<{
    today_earnings: string;
    week_earnings: string;
    month_earnings: string;
    total_earnings: string;
    today_orders: string;
    week_orders: string;
    month_orders: string;
    total_orders: string;
    pending_settlement: string;
    last_settlement_at: Date | null;
  }> {
    const r = await this.db.query<{
      today_earnings: string;
      week_earnings: string;
      month_earnings: string;
      total_earnings: string;
      today_orders: string;
      week_orders: string;
      month_orders: string;
      total_orders: string;
      pending_settlement: string;
      last_settlement_at: Date | null;
    }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN o.delivered_at >= CURRENT_DATE THEN c.store_amount ELSE 0 END), 0)::text AS today_earnings,
        COALESCE(SUM(CASE WHEN o.delivered_at >= CURRENT_DATE - INTERVAL '7 days' THEN c.store_amount ELSE 0 END), 0)::text AS week_earnings,
        COALESCE(SUM(CASE WHEN o.delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.store_amount ELSE 0 END), 0)::text AS month_earnings,
        COALESCE(SUM(c.store_amount), 0)::text AS total_earnings,
        COUNT(CASE WHEN o.delivered_at >= CURRENT_DATE THEN 1 END)::text AS today_orders,
        COUNT(CASE WHEN o.delivered_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::text AS week_orders,
        COUNT(CASE WHEN o.delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::text AS month_orders,
        COUNT(*)::text AS total_orders,
        COALESCE(
          (SELECT SUM(net_amount) FROM settlements 
           WHERE party_type = 'store' AND party_id = $1 AND status IN ('pending','approved')),
          0
        )::text AS pending_settlement,
        (SELECT MAX(settled_at) FROM settlements 
         WHERE party_type = 'store' AND party_id = $1 AND status = 'paid') AS last_settlement_at
      FROM commissions c
      JOIN orders o ON o.id = c.order_id
      WHERE c.store_id = $1 AND o.status = 'delivered'
      `,
      [storeId],
    );

    const row = r.rows[0];
    return {
      today_earnings: row.today_earnings,
      week_earnings: row.week_earnings,
      month_earnings: row.month_earnings,
      total_earnings: row.total_earnings,
      today_orders: row.today_orders,
      week_orders: row.week_orders,
      month_orders: row.month_orders,
      total_orders: row.total_orders,
      pending_settlement: row.pending_settlement,
      last_settlement_at: row.last_settlement_at,
    };
  }

  // ═══════════════ Settlements ═══════════════

  async listSettlements(query: {
    page: number;
    limit: number;
    partyType?: string;
    status?: string;
  }): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.partyType) {
      where.push(`s.party_type = $${i++}`);
      params.push(query.partyType);
    }
    if (query.status) {
      where.push(`s.status = $${i++}`);
      params.push(query.status);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM settlements s ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        s.id, s.party_type, s.party_id,
        COALESCE(st.name_ar, du.full_name) AS party_name,
        s.period_start, s.period_end,
        s.gross_amount, s.commission_amount, s.net_amount,
        s.status, s.notes, s.settled_at, s.created_at
      FROM settlements s
      LEFT JOIN stores st ON st.id = s.party_id AND s.party_type = 'store'
      LEFT JOIN users du ON du.id = s.party_id AND s.party_type = 'driver'
      ${whereSql}
      ORDER BY s.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findSettlementById(id: string): Promise<any | null> {
    const r = await this.db.query(
      `
      SELECT
        s.id, s.party_type, s.party_id,
        COALESCE(st.name_ar, du.full_name) AS party_name,
        s.period_start, s.period_end,
        s.gross_amount, s.commission_amount, s.net_amount,
        s.status, s.notes, s.settled_at, s.created_at
      FROM settlements s
      LEFT JOIN stores st ON st.id = s.party_id AND s.party_type = 'store'
      LEFT JOIN users du ON du.id = s.party_id AND s.party_type = 'driver'
      WHERE s.id = $1
      LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async createSettlement(params: {
    partyType: 'store' | 'driver';
    partyId: string;
    periodStart: string;
    periodEnd: string;
    notes?: string;
    createdBy: string;
  }): Promise<any | null> {
    return this.db.transaction(async (client: PoolClient) => {
      // Lock eligible commission rows so concurrent settlement requests cannot claim the same earnings.
      const idColumn = params.partyType === 'store' ? 'c.store_id' : 'o.driver_id';
      const amountColumn = params.partyType === 'store' ? 'c.store_amount' : 'c.driver_amount';
      const eligible = await client.query<{
        id: string; amount: string; commission_amount: string; currency: string;
      }>(
        `
        SELECT c.id, c.${amountColumn}::text AS amount,
               c.commission_amount::text AS commission_amount, o.currency
        FROM commissions c
        JOIN orders o ON o.id = c.order_id
        WHERE ${idColumn} = $1
          AND o.status = 'delivered'
          AND o.delivered_at::date BETWEEN $2::date AND $3::date
          AND NOT EXISTS (
            SELECT 1 FROM settlement_commission_items sci
            WHERE sci.commission_id = c.id
              AND sci.party_type = $4
              AND sci.released_at IS NULL
          )
        ORDER BY o.delivered_at, c.id
        FOR UPDATE OF c SKIP LOCKED
        `,
        [params.partyId, params.periodStart, params.periodEnd, params.partyType],
      );

      if (eligible.rows.length === 0) return null;
      const currencies = [...new Set(eligible.rows.map((r) => r.currency.trim()))];
      if (currencies.length !== 1) {
        throw new Error('Cannot create one settlement for commissions with different currencies');
      }

      const gross = eligible.rows.reduce((sum, row) => sum + Number(row.amount), 0);
      const commission = params.partyType === 'store'
        ? eligible.rows.reduce((sum, row) => sum + Number(row.commission_amount), 0)
        : 0;
      const currency = currencies[0];
      const created = await client.query(
        `
        INSERT INTO settlements (
          party_type, party_id, period_start, period_end, gross_amount,
          commission_amount, net_amount, currency, status, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $5, $7, 'pending', $8, $9)
        RETURNING id, party_type, party_id, period_start, period_end,
                  gross_amount, commission_amount, net_amount, currency,
                  status, notes, settled_at, created_at
        `,
        [params.partyType, params.partyId, params.periodStart, params.periodEnd,
          gross, commission, currency, params.notes ?? null, params.createdBy],
      );
      const settlement = created.rows[0];

      for (const row of eligible.rows) {
        await client.query(
          `INSERT INTO settlement_commission_items (settlement_id, commission_id, party_type, amount)
           VALUES ($1, $2, $3, $4)`,
          [settlement.id, row.id, params.partyType, row.amount],
        );
      }

      await client.query(
        `INSERT INTO audit_logs
          (actor_user_id, actor_role, action, entity_type, entity_id, new_value)
         VALUES ($1, 'finance', 'finance.settlement.create', 'settlement', $2, $3::jsonb)`,
        [params.createdBy, settlement.id, JSON.stringify({
          partyType: params.partyType, partyId: params.partyId,
          grossAmount: gross, commissionAmount: commission, currency,
          commissionCount: eligible.rows.length,
        })],
      );
      return settlement;
    });
  }

  async updateSettlementStatus(
    id: string,
    status: 'approved' | 'paid' | 'cancelled',
    actorId: string,
  ): Promise<any | null> {
    return this.db.transaction(async (client: PoolClient) => {
      const currentResult = await client.query<{
        id: string; party_type: 'store' | 'driver'; party_id: string;
        status: string; net_amount: string; currency: string | null;
      }>(
        `SELECT id, party_type, party_id, status, net_amount::text, currency
         FROM settlements WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const current = currentResult.rows[0];
      if (!current) return null;

      const allowed =
        (status === 'approved' && current.status === 'pending') ||
        (status === 'paid' && current.status === 'approved') ||
        (status === 'cancelled' && ['pending', 'approved'].includes(current.status));
      if (!allowed) {
        throw new Error(`Invalid settlement transition: ${current.status} -> ${status}`);
      }

      if (status === 'paid') {
        if (!current.currency) {
          throw new Error('Settlement currency is missing; reconcile this legacy settlement before marking it paid');
        }
        await client.query(
          `INSERT INTO transactions
            (settlement_id, account_type, account_id, type, direction, amount, currency, description, created_by)
           VALUES ($1, $2, $3, 'settlement_payout', 'debit', $4, $5, $6, $7)
           ON CONFLICT (settlement_id)
             WHERE settlement_id IS NOT NULL AND type = 'settlement_payout' AND direction = 'debit'
           DO NOTHING`,
          [id, current.party_type, current.party_id, current.net_amount,
            current.currency, `Settlement payout ${id}`, actorId],
        );
      }

      if (status === 'cancelled') {
        await client.query(
          `UPDATE settlement_commission_items
           SET released_at = now()
           WHERE settlement_id = $1 AND released_at IS NULL`,
          [id],
        );
      }

      const updated = await client.query(
        `UPDATE settlements
         SET status = $1, approved_by = $2,
             settled_at = CASE WHEN $1 = 'paid' THEN now() ELSE settled_at END
         WHERE id = $3
         RETURNING id, party_type, party_id, period_start, period_end,
                   gross_amount, commission_amount, net_amount, currency,
                   status, notes, settled_at, created_at`,
        [status, actorId, id],
      );

      await client.query(
        `INSERT INTO audit_logs
          (actor_user_id, actor_role, action, entity_type, entity_id, old_value, new_value)
         VALUES ($1, 'finance', $2, 'settlement', $3, $4::jsonb, $5::jsonb)`,
        [actorId, `finance.settlement.${status}`, id,
          JSON.stringify({ status: current.status }),
          JSON.stringify({ status, payoutAmount: status === 'paid' ? Number(current.net_amount) : null,
            currency: current.currency })],
      );
      return updated.rows[0] ?? null;
    });
  }

  // ═══════════════ Commissions ═══════════════

  async listCommissions(query: {
    page: number;
    limit: number;
    storeId?: string;
  }): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.storeId) {
      where.push(`c.store_id = $${i++}`);
      params.push(query.storeId);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM commissions c ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        c.id, c.order_id, o.order_number,
        c.store_id, s.name_ar AS store_name,
        c.rate_percent, c.order_amount, c.delivery_fee, c.discount_amount,
        c.commission_amount, c.store_amount, c.driver_amount, c.platform_amount,
        c.created_at
      FROM commissions c
      JOIN orders o ON o.id = c.order_id
      JOIN stores s ON s.id = c.store_id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  /**
   * حساب العمولة لطلب مُسلَّم
   * يُستدعى عند التسليم
   */
  async computeCommissionForOrder(orderId: string): Promise<any | null> {
    return this.db.transaction(async (client: PoolClient) => {
      // 1) هل يوجد commission مسبقًا؟
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM commissions WHERE order_id = $1 LIMIT 1`,
        [orderId],
      );
      if (existing.rows[0]) {
        return existing.rows[0];
      }

      // 2) اجلب الطلب
      const orderRes = await client.query<{
        id: string;
        store_id: string;
        subtotal: string;
        delivery_fee: string;
        discount_total: string;
        total: string;
      }>(
        `
        SELECT id, store_id, subtotal, delivery_fee, discount_total, total
        FROM orders
        WHERE id = $1 AND status = 'delivered'
        LIMIT 1
        `,
        [orderId],
      );
      const order = orderRes.rows[0];
      if (!order) return null;

      // 3) اجلب نسبة عمولة المتجر
      const storeRes = await client.query<{ commission_rate: string | null }>(
        `SELECT commission_rate FROM stores WHERE id = $1`,
        [order.store_id],
      );
      let rate = storeRes.rows[0]?.commission_rate;

      if (rate === null || rate === undefined) {
        // استخدم الافتراضي من settings
        const settingRes = await client.query<{ value: any }>(
          `SELECT value FROM settings WHERE key = 'commission.default_rate_percent' LIMIT 1`,
        );
        rate = settingRes.rows[0]?.value ?? 10;
      }

      const rateNum = parseFloat(String(rate));
      const subtotal = parseFloat(order.subtotal);
      const deliveryFee = parseFloat(order.delivery_fee);
      const discountTotal = parseFloat(order.discount_total);

      // 4) الحسابات
      const commissionAmount = (subtotal * rateNum) / 100;
      const storeAmount = subtotal - commissionAmount;
      const driverAmount = deliveryFee;
      const platformAmount = commissionAmount;

      // 5) أدخل commission
      const insertRes = await client.query(
        `
        INSERT INTO commissions (
          order_id, store_id, rate_percent,
          order_amount, delivery_fee, discount_amount,
          commission_amount, store_amount, driver_amount, platform_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        `,
        [
          orderId,
          order.store_id,
          rateNum,
          subtotal,
          deliveryFee,
          discountTotal,
          commissionAmount,
          storeAmount,
          driverAmount,
          platformAmount,
        ],
      );

      // 6) سجّل في الـ Ledger
      const currencyRes = await client.query<{ value: any }>(
        `SELECT value FROM settings WHERE key = 'currency' LIMIT 1`,
      );
      const currency = String(currencyRes.rows[0]?.value ?? 'USD').replace(/"/g, '');

      // Store credit
      await client.query(
        `
        INSERT INTO transactions (
          order_id, account_type, account_id, type, direction, amount, currency, description
        )
        VALUES ($1, 'store', $2, 'store_earning', 'credit', $3, $4, 'Store earning')
        `,
        [orderId, order.store_id, storeAmount, currency],
      );

      // Platform commission
      await client.query(
        `
        INSERT INTO transactions (
          order_id, account_type, type, direction, amount, currency, description
        )
        VALUES ($1, 'platform', 'commission', 'credit', $2, $3, 'Platform commission')
        `,
        [orderId, commissionAmount, currency],
      );

      // Driver earning (يُحتسب عند التسليم أيضًا)
      const driverRes = await client.query<{ driver_id: string }>(
        `SELECT driver_id FROM orders WHERE id = $1`,
        [orderId],
      );
      if (driverRes.rows[0]?.driver_id) {
        await client.query(
          `
          INSERT INTO transactions (
            order_id, account_type, account_id, type, direction, amount, currency, description
          )
          VALUES ($1, 'driver', $2, 'driver_earning', 'credit', $3, $4, 'Driver earning')
          `,
          [orderId, driverRes.rows[0].driver_id, driverAmount, currency],
        );
      }

      return insertRes.rows[0];
    });
  }

  // ═══════════════ Ledger ═══════════════

  async listLedger(query: {
    page: number;
    limit: number;
    accountType?: string;
    accountId?: string;
  }): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.accountType) {
      where.push(`t.account_type = $${i++}`);
      params.push(query.accountType);
    }
    if (query.accountId) {
      where.push(`t.account_id = $${i++}`);
      params.push(query.accountId);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM transactions t ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        t.id, t.order_id, o.order_number,
        t.account_type, t.account_id, t.type, t.direction,
        t.amount, t.currency, t.description, t.created_at
      FROM transactions t
      LEFT JOIN orders o ON o.id = t.order_id
      ${whereSql}
      ORDER BY t.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  // ═══════════════ Helpers ═══════════════

  async getUnsettledCommissions(
    partyType: 'store' | 'driver',
    partyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ gross: string; commission: string; net: string; count: string }> {
    const amountColumn = partyType === 'store' ? 'c.store_amount' : 'c.driver_amount';
    const idColumn = partyType === 'store' ? 'c.store_id' : 'o.driver_id';
    const r = await this.db.query<{
      gross: string; commission: string; net: string; count: string;
    }>(
      `
      SELECT
        COALESCE(SUM(${amountColumn}), 0)::text AS gross,
        COALESCE(SUM(CASE WHEN $4 = 'store' THEN c.commission_amount ELSE 0 END), 0)::text AS commission,
        COALESCE(SUM(${amountColumn}), 0)::text AS net,
        COUNT(*)::text AS count
      FROM commissions c
      JOIN orders o ON o.id = c.order_id
      WHERE ${idColumn} = $1
        AND o.status = 'delivered'
        AND o.delivered_at::date BETWEEN $2::date AND $3::date
        AND NOT EXISTS (
          SELECT 1 FROM settlement_commission_items sci
          WHERE sci.commission_id = c.id
            AND sci.party_type = $4
            AND sci.released_at IS NULL
        )
      `,
      [partyId, periodStart, periodEnd, partyType],
    );
    return r.rows[0];
  }

}
