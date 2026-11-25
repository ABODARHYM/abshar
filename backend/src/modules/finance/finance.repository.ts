import { ConflictException, Injectable } from '@nestjs/common';
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
    currency_breakdown: Array<{
      currency: string;
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
    }>;
  }> {
    const r = await this.db.query<{
      currency: string;
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
      WITH local_day AS (
        SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Aden')::date AS today
      )
      SELECT
        COALESCE(NULLIF(BTRIM(o.currency), ''), 'UNKNOWN') AS currency,
        COALESCE(SUM(c.store_amount) FILTER (
          WHERE o.delivered_at >= (d.today::timestamp AT TIME ZONE 'Asia/Aden')
        ), 0)::text AS today_earnings,
        COALESCE(SUM(c.store_amount) FILTER (
          WHERE o.delivered_at >= ((d.today - 6)::timestamp AT TIME ZONE 'Asia/Aden')
        ), 0)::text AS week_earnings,
        COALESCE(SUM(c.store_amount) FILTER (
          WHERE o.delivered_at >= ((d.today - 29)::timestamp AT TIME ZONE 'Asia/Aden')
        ), 0)::text AS month_earnings,
        COALESCE(SUM(c.store_amount), 0)::text AS total_earnings,
        COUNT(*) FILTER (
          WHERE o.delivered_at >= (d.today::timestamp AT TIME ZONE 'Asia/Aden')
        )::text AS today_orders,
        COUNT(*) FILTER (
          WHERE o.delivered_at >= ((d.today - 6)::timestamp AT TIME ZONE 'Asia/Aden')
        )::text AS week_orders,
        COUNT(*) FILTER (
          WHERE o.delivered_at >= ((d.today - 29)::timestamp AT TIME ZONE 'Asia/Aden')
        )::text AS month_orders,
        COUNT(*)::text AS total_orders,
        COALESCE((
          SELECT SUM(s.net_amount)
          FROM settlements s
          WHERE s.party_type = 'store' AND s.party_id = $1
            AND s.status IN ('pending', 'approved')
            AND COALESCE(NULLIF(BTRIM(s.currency), ''), 'UNKNOWN') =
                COALESCE(NULLIF(BTRIM(o.currency), ''), 'UNKNOWN')
        ), 0)::text AS pending_settlement,
        (
          SELECT MAX(s.settled_at)
          FROM settlements s
          WHERE s.party_type = 'store' AND s.party_id = $1
            AND s.status = 'paid'
            AND COALESCE(NULLIF(BTRIM(s.currency), ''), 'UNKNOWN') =
                COALESCE(NULLIF(BTRIM(o.currency), ''), 'UNKNOWN')
        ) AS last_settlement_at
      FROM commissions c
      JOIN orders o ON o.id = c.order_id
      CROSS JOIN local_day d
      WHERE c.store_id = $1 AND o.status = 'delivered'
      GROUP BY COALESCE(NULLIF(BTRIM(o.currency), ''), 'UNKNOWN')
      ORDER BY currency
      `,
      [storeId],
    );
    return { currency_breakdown: r.rows };
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
        s.gross_amount, s.commission_amount, s.net_amount, s.currency,
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

  async listUnverifiedDeliveryFees(query: { page: number; limit: number }): Promise<{ rows: any[]; total: number }> {
    const count = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM orders o
       WHERE o.status = 'delivered'
         AND o.driver_id IS NOT NULL
         AND COALESCE((to_jsonb(o)->>'original_delivery_fee_verified')::boolean, FALSE) = FALSE`,
    );
    const total = Number.parseInt(count.rows[0]?.count ?? '0', 10);
    const offset = toOffset(query);
    const rows = await this.db.query(
      `SELECT o.id AS order_id, o.order_number, o.driver_id,
              u.full_name AS driver_name, o.store_id, s.name_ar AS store_name,
              o.delivery_fee, o.original_delivery_fee, o.currency, o.delivered_at
       FROM orders o
       LEFT JOIN users u ON u.id = o.driver_id
       LEFT JOIN stores s ON s.id = o.store_id
       WHERE o.status = 'delivered'
         AND o.driver_id IS NOT NULL
         AND COALESCE((to_jsonb(o)->>'original_delivery_fee_verified')::boolean, FALSE) = FALSE
       ORDER BY o.delivered_at ASC NULLS FIRST, o.id
       LIMIT $1 OFFSET $2`,
      [query.limit, offset],
    );
    return { rows: rows.rows, total };
  }

  async findSettlementById(id: string): Promise<any | null> {
    const r = await this.db.query(
      `
      SELECT
        s.id, s.party_type, s.party_id,
        COALESCE(st.name_ar, du.full_name) AS party_name,
        s.period_start, s.period_end,
        s.gross_amount, s.commission_amount, s.net_amount, s.currency,
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
    actorRole: string | null;
  }): Promise<any | null> {
    return this.db.transaction(async (client: PoolClient) => {
      // Lock eligible commission rows so concurrent settlement requests cannot claim the same earnings.
      const idColumn = params.partyType === 'store' ? 'c.store_id' : 'o.driver_id';
      const amountColumn = params.partyType === 'store' ? 'c.store_amount' : 'c.driver_amount';
      const grossAmountColumn = params.partyType === 'store' ? 'c.order_amount' : 'c.driver_amount';
      const eligible = await client.query<{
        id: string; amount: string; gross_amount: string; commission_amount: string; currency: string;
      }>(
        `
        SELECT c.id, ${amountColumn}::text AS amount,
               ${grossAmountColumn}::text AS gross_amount,
               c.commission_amount::text AS commission_amount, o.currency
        FROM commissions c
        JOIN orders o ON o.id = c.order_id
        WHERE ${idColumn} = $1
          AND o.status = 'delivered'
          AND o.delivered_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Aden')
          AND o.delivered_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Aden')
          AND ${amountColumn} > 0
          AND ($4 <> 'driver' OR COALESCE((to_jsonb(o)->>'original_delivery_fee_verified')::boolean, FALSE) = TRUE)
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
        throw new ConflictException('Cannot create one settlement for commissions with different currencies');
      }

      // Keep monetary aggregation in PostgreSQL NUMERIC; do not sum money using JS floats.
      const totals = await client.query<{ gross: string; commission: string; net: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN $2 = 'store' THEN c.order_amount ELSE c.driver_amount END), 0)::text AS gross,
           COALESCE(SUM(CASE WHEN $2 = 'store' THEN c.commission_amount ELSE 0 END), 0)::text AS commission,
           COALESCE(SUM(CASE WHEN $2 = 'store' THEN c.store_amount ELSE c.driver_amount END), 0)::text AS net
         FROM commissions c
         WHERE c.id = ANY($1::uuid[])`,
        [eligible.rows.map((row) => row.id), params.partyType],
      );
      const gross = totals.rows[0].gross;
      const commission = totals.rows[0].commission;
      const net = totals.rows[0].net;
      const currency = currencies[0];
      const created = await client.query(
        `
        INSERT INTO settlements (
          party_type, party_id, period_start, period_end, gross_amount,
          commission_amount, net_amount, currency, status, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
        RETURNING id, party_type, party_id, period_start, period_end,
                  gross_amount, commission_amount, net_amount, currency,
                  status, notes, settled_at, created_at
        `,
        [params.partyType, params.partyId, params.periodStart, params.periodEnd,
          gross, commission, net, currency, params.notes ?? null, params.createdBy],
      );
      const settlement = created.rows[0];

      for (const row of eligible.rows) {
        await client.query(
          `INSERT INTO settlement_commission_items (settlement_id, commission_id, party_type, amount)
           VALUES ($1, $2, $3, $4)`,
          [settlement.id, row.id, params.partyType, row.amount],
        );
        // Keep the legacy reservation table synchronized for compatibility.
        await client.query(
          `INSERT INTO settlement_commissions (settlement_id, party_type, party_id, commission_id)
           VALUES ($1, $2, $3, $4)`,
          [settlement.id, params.partyType, params.partyId, row.id],
        );
      }

      await client.query(
        `INSERT INTO audit_logs
          (actor_user_id, actor_role, action, entity_type, entity_id, new_value)
         VALUES ($1, $2, 'finance.settlement.create', 'settlement', $3, $4::jsonb)`,
        [params.createdBy, params.actorRole, settlement.id, JSON.stringify({
          partyType: params.partyType, partyId: params.partyId,
          grossAmount: gross, commissionAmount: commission, netAmount: net, currency,
          commissionCount: eligible.rows.length,
        })],
      );
      await client.query(
        `INSERT INTO settlement_events
          (settlement_id, from_status, to_status, actor_user_id, note)
         VALUES ($1, NULL, 'pending', $2, $3)`,
        [settlement.id, params.createdBy, params.notes ?? null],
      );
      return settlement;
    });
  }

  async updateSettlementStatus(
    id: string,
    status: 'approved' | 'paid' | 'cancelled',
    actorId: string,
    actorRole: string | null,
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
        throw new ConflictException(`Invalid settlement transition: ${current.status} -> ${status}`);
      }

      if (status === 'paid') {
        if (!current.currency) {
          throw new ConflictException('Settlement currency is missing; reconcile this legacy settlement before marking it paid');
        }
        const existingPayout = await client.query<{
          account_type: string;
          account_id: string | null;
          amount: string;
          currency: string;
        }>(
          `SELECT account_type, account_id, amount::text, currency
           FROM transactions
           WHERE settlement_id = $1 AND type = 'settlement_payout' AND direction = 'debit'
           FOR UPDATE`,
          [id],
        );
        if (existingPayout.rows.length > 0) {
          const payout = existingPayout.rows[0];
          if (
            payout.account_type !== current.party_type ||
            payout.account_id !== current.party_id ||
            payout.amount !== current.net_amount ||
            payout.currency?.trim() !== current.currency.trim()
          ) {
            throw new ConflictException('An existing settlement payout conflicts with the settlement amount, party, or currency');
          }
        } else {
          await client.query(
            `INSERT INTO transactions
              (settlement_id, account_type, account_id, type, direction, amount, currency, description, created_by, idempotency_key)
             VALUES ($1, $2, $3, 'settlement_payout', 'debit', $4, $5, $6, $7, $8)
             `,
            [id, current.party_type, current.party_id, current.net_amount,
              current.currency, `Settlement payout ${id}`, actorId, `settlement:${id}:payout`],
          );
        }
      }

      const updated = await client.query(
        `UPDATE settlements
         SET status = $1,
             approved_by = CASE WHEN $1 = 'approved' THEN $2 ELSE approved_by END,
             settled_at = CASE WHEN $1 = 'paid' THEN now() ELSE settled_at END
         WHERE id = $3
         RETURNING id, party_type, party_id, period_start, period_end,
                   gross_amount, commission_amount, net_amount, currency,
                   status, notes, settled_at, created_at`,
        [status, actorId, id],
      );

      if (status === 'cancelled') {
        await client.query(
          `UPDATE settlement_commission_items
           SET released_at = now()
           WHERE settlement_id = $1 AND released_at IS NULL`,
          [id],
        );
        await client.query(
          `UPDATE settlement_commissions
           SET released_at = now()
           WHERE settlement_id = $1 AND released_at IS NULL`,
          [id],
        );
      }

      await client.query(
        `INSERT INTO audit_logs
          (actor_user_id, actor_role, action, entity_type, entity_id, old_value, new_value)
         VALUES ($1, $2, $3, 'settlement', $4, $5::jsonb, $6::jsonb)`,
        [actorId, actorRole, `finance.settlement.${status}`, id,
          JSON.stringify({ status: current.status }),
          JSON.stringify({ status, payoutAmount: status === 'paid' ? Number(current.net_amount) : null,
            currency: current.currency })],
      );
      await client.query(
        `INSERT INTO settlement_events
          (settlement_id, from_status, to_status, actor_user_id, note)
         VALUES ($1, $2, $3, $4, NULL)`,
        [id, current.status, status, actorId],
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
        c.rate_percent, c.order_amount, c.delivery_fee, c.original_delivery_fee, c.discount_amount,
        c.commission_amount, c.store_amount, c.driver_amount, c.platform_amount,
        o.currency, c.created_at
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
  async computeCommissionForOrder(orderId: string, transactionClient?: PoolClient): Promise<any | null> {
    const execute = async (client: PoolClient): Promise<any | null> => {
      // Re-read the delivered order on every retry so missing ledger rows can be repaired.
      const orderRes = await client.query<{
        id: string;
        store_id: string;
        driver_id: string | null;
        subtotal: string;
        delivery_fee: string;
        original_delivery_fee: string | null;
        original_delivery_fee_verified: boolean;
        discount_total: string;
        total: string;
        currency: string;
      }>(
        `
        SELECT id, store_id, driver_id, subtotal, delivery_fee, original_delivery_fee,
               COALESCE((to_jsonb(orders)->>'original_delivery_fee_verified')::boolean, FALSE) AS original_delivery_fee_verified,
               discount_total, total, currency
        FROM orders
        WHERE id = $1 AND status = 'delivered'
        FOR UPDATE
        `,
        [orderId],
      );
      const order = orderRes.rows[0];
      if (!order) return null;

      // Read the existing commission first. Do not recalculate historical rates on retries.
      const existingRes = await client.query(
        `SELECT * FROM commissions WHERE order_id = $1 LIMIT 1`,
        [orderId],
      );
      let commissionRow = existingRes.rows[0];

      if (!commissionRow && (!order.original_delivery_fee_verified || order.original_delivery_fee === null)) {
        throw new ConflictException('Original delivery fee is unknown for this historical order; commission requires manual reconciliation');
      }

      if (!commissionRow) {
        const storeRes = await client.query<{ commission_rate: string | null }>(
          `SELECT commission_rate FROM stores WHERE id = $1`,
          [order.store_id],
        );
        let rate = storeRes.rows[0]?.commission_rate;
        if (rate === null || rate === undefined) {
          const settingRes = await client.query<{ value: any }>(
            `SELECT value FROM settings WHERE key = 'commission.default_rate_percent' LIMIT 1`,
          );
          rate = settingRes.rows[0]?.value ?? 10;
        }

        const rateText = String(rate);
        if (!Number.isFinite(Number(rateText)) || Number(rateText) < 0 || Number(rateText) > 100) {
          throw new ConflictException('The configured commission rate is invalid');
        }

        const inserted = await client.query(
          `
          INSERT INTO commissions (
            order_id, store_id, rate_percent,
            order_amount, delivery_fee, original_delivery_fee, discount_amount,
            commission_amount, store_amount, driver_amount, platform_amount
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ROUND($4::numeric * $3::numeric / 100, 2),
            $4::numeric - ROUND($4::numeric * $3::numeric / 100, 2),
            $6::numeric,
            ROUND($4::numeric * $3::numeric / 100, 2)
          )
          ON CONFLICT (order_id) DO NOTHING
          RETURNING *
          `,
          [orderId, order.store_id, rateText, order.subtotal, order.delivery_fee, order.original_delivery_fee, order.discount_total],
        );
        commissionRow = inserted.rows[0];
        if (!commissionRow) {
          const concurrent = await client.query(
            `SELECT * FROM commissions WHERE order_id = $1 LIMIT 1`,
            [orderId],
          );
          commissionRow = concurrent.rows[0];
        }
      }

      if (!commissionRow) return null;

      const originalDeliveryFee = order.original_delivery_fee ?? commissionRow.original_delivery_fee ?? null;
      if (
        commissionRow.store_id !== order.store_id ||
        String(commissionRow.order_amount) !== String(order.subtotal) ||
        String(commissionRow.delivery_fee) !== String(order.delivery_fee) ||
        String(commissionRow.discount_amount) !== String(order.discount_total) ||
        String(commissionRow.original_delivery_fee ?? '') !== String(order.original_delivery_fee ?? '')
      ) {
        throw new ConflictException('Existing commission does not match the delivered order financial snapshot');
      }

      // The order snapshot is authoritative for currency; preserve the driver's identity
      // as the creator of all delivery-time ledger credits.
      const currency = order.currency;
      const creatorId = order.driver_id;

      const ensurePlatformDebit = async (
        amount: string,
        description: string,
        idempotencyKey: string,
      ): Promise<void> => {
        if (Number(amount) <= 0) return;
        const existing = await client.query<{
          order_id: string;
          account_type: string;
          account_id: string | null;
          type: string;
          direction: string;
          amount: string;
          currency: string;
        }>(
          `SELECT order_id, account_type, account_id, type, direction, amount::text, currency
           FROM transactions WHERE idempotency_key = $1 LIMIT 1`,
          [idempotencyKey],
        );
        if (existing.rows.length > 0) {
          const debit = existing.rows[0];
          if (
            debit.order_id !== orderId ||
            debit.account_type !== 'platform' ||
            debit.account_id !== null ||
            debit.type !== 'discount' ||
            debit.direction !== 'debit' ||
            debit.amount !== amount ||
            debit.currency?.trim() !== currency.trim()
          ) {
            throw new ConflictException('An existing platform-funded discount conflicts with the delivered order');
          }
          return;
        }

        await client.query(
          `INSERT INTO transactions (
             order_id, account_type, account_id, type, direction, amount,
             currency, description, created_by, idempotency_key
           )
           VALUES ($1, 'platform', NULL, 'discount', 'debit', $2, $3, $4, $5, $6)`,
          [orderId, amount, currency, description, creatorId, idempotencyKey],
        );
      };

      const existingStoreEarning = await client.query<{
        account_type: string;
        account_id: string | null;
        direction: string;
        amount: string;
        currency: string;
      }>(
        `SELECT account_type, account_id, direction, amount::text, currency
         FROM transactions WHERE order_id = $1 AND type = 'store_earning' LIMIT 1`,
        [orderId],
      );
      if (existingStoreEarning.rows.length > 0) {
        const earning = existingStoreEarning.rows[0];
        if (
          earning.account_type !== 'store' ||
          earning.account_id !== order.store_id ||
          earning.direction !== 'credit' ||
          earning.amount !== String(commissionRow.store_amount) ||
          earning.currency?.trim() !== currency.trim()
        ) {
          throw new ConflictException('An existing store earning conflicts with the delivered commission');
        }
      } else {
        await client.query(
          `
          INSERT INTO transactions (
            order_id, account_type, account_id, type, direction, amount,
            currency, description, created_by, idempotency_key
          )
          VALUES ($1, 'store', $2, 'store_earning', 'credit', $3, $4, 'Store earning', $5, $6)
          `,
          [orderId, order.store_id, commissionRow.store_amount, currency, creatorId, `order:${orderId}:store:store_earning:credit`],
        );
      }

      const existingPlatformCommission = await client.query<{
        account_type: string;
        account_id: string | null;
        direction: string;
        amount: string;
        currency: string;
      }>(
        `SELECT account_type, account_id, direction, amount::text, currency
         FROM transactions WHERE order_id = $1 AND type = 'commission' LIMIT 1`,
        [orderId],
      );
      if (existingPlatformCommission.rows.length > 0) {
        const earning = existingPlatformCommission.rows[0];
        if (
          earning.account_type !== 'platform' ||
          earning.account_id !== null ||
          earning.direction !== 'credit' ||
          earning.amount !== String(commissionRow.platform_amount) ||
          earning.currency?.trim() !== currency.trim()
        ) {
          throw new ConflictException('An existing platform commission conflicts with the delivered commission');
        }
      } else {
        await client.query(
          `
          INSERT INTO transactions (
            order_id, account_type, type, direction, amount,
            currency, description, created_by, idempotency_key
          )
          VALUES ($1, 'platform', 'commission', 'credit', $2, $3, 'Platform commission', $4, $5)
          `,
          [orderId, commissionRow.platform_amount, currency, creatorId, `order:${orderId}:platform:commission:credit`],
        );
      }

      if (order.driver_id && Number(commissionRow.driver_amount) > 0) {
        const existingDriverEarning = await client.query<{
          account_type: string;
          account_id: string | null;
          direction: string;
          amount: string;
          currency: string;
        }>(
          `SELECT account_type, account_id, direction, amount::text, currency
           FROM transactions WHERE order_id = $1 AND type = 'driver_earning' LIMIT 1`,
          [orderId],
        );
        if (existingDriverEarning.rows.length > 0) {
          const earning = existingDriverEarning.rows[0];
          if (
            earning.account_type !== 'driver' ||
            earning.account_id !== order.driver_id ||
            earning.direction !== 'credit' ||
            earning.amount !== String(commissionRow.driver_amount) ||
            earning.currency?.trim() !== currency.trim()
          ) {
            throw new ConflictException('An existing driver earning conflicts with the delivered commission');
          }
        } else {
          await client.query(
            `
            INSERT INTO transactions (
              order_id, account_type, account_id, type, direction, amount,
              currency, description, created_by, idempotency_key
            )
            VALUES ($1, 'driver', $2, 'driver_earning', 'credit', $3, $4, 'Driver earning', $5, $6)
              `,
            [orderId, order.driver_id, commissionRow.driver_amount, currency, creatorId, `order:${orderId}:driver:driver_earning:credit`],
          );
        }
      }

      // Product discounts are platform-funded; the store's commissionable subtotal is unchanged.
      await ensurePlatformDebit(
        order.discount_total,
        'Platform-funded customer discount',
        `order:${orderId}:platform:customer_discount:debit`,
      );

      // Free delivery is also platform-funded. The driver still earns the original fee.
      if (originalDeliveryFee !== null) {
        const waivedResult = await client.query<{ is_valid: boolean; amount: string }>(
          `SELECT
             $1::numeric >= $2::numeric AS is_valid,
             GREATEST($1::numeric - $2::numeric, 0)::numeric(12,2)::text AS amount`,
          [originalDeliveryFee, order.delivery_fee],
        );
        if (!waivedResult.rows[0]?.is_valid) {
          throw new ConflictException('Original delivery fee cannot be lower than the customer delivery fee');
        }
        await ensurePlatformDebit(
          waivedResult.rows[0].amount,
          'Platform-funded free delivery',
          `order:${orderId}:platform:free_delivery:debit`,
        );
      }

      return commissionRow;
    };

    return transactionClient ? execute(transactionClient) : this.db.transaction(execute);
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
    const commissionColumn = partyType === 'store' ? 'c.commission_amount' : '0::numeric';
    const r = await this.db.query<{
      gross: string; commission: string; net: string; count: string;
    }>(
      `
      SELECT
        COALESCE(SUM(${amountColumn}), 0)::text AS gross,
        COALESCE(SUM(${commissionColumn}), 0)::text AS commission,
        COALESCE(SUM(${amountColumn}), 0)::text AS net,
        COUNT(*)::text AS count
      FROM commissions c
      JOIN orders o ON o.id = c.order_id
      WHERE ${idColumn} = $1
        AND o.status = 'delivered'
        AND o.delivered_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Aden')
        AND o.delivered_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Aden')
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
