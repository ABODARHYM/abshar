import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';

export interface LoyaltyBalanceRow {
  points: number;
  lifetime_earned: string;
  lifetime_redeemed: string;
}

export interface LoyaltyTransactionRow {
  id: string;
  type: string;
  points: number;
  order_id: string | null;
  order_number: string | null;
  description: string | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface RewardRow {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: string | number;
  image_url: string | null;
  stock: number | null;
  used_count: number;
  is_active: boolean;
  sort_order: number;
}

@Injectable()
export class LoyaltyRepository {
  constructor(private readonly db: DatabaseService) {}

  async getBalance(customerId: string): Promise<LoyaltyBalanceRow> {
    const r = await this.db.query<LoyaltyBalanceRow>(
      `
      SELECT
        COALESCE(c.loyalty_points, 0)::int AS points,
        COALESCE((SELECT SUM(points) FROM loyalty_transactions WHERE customer_id = $1 AND type = 'earn' AND points > 0), 0)::text AS lifetime_earned,
        COALESCE((SELECT SUM(points) FROM loyalty_transactions WHERE customer_id = $1 AND type = 'redeem' AND points < 0), 0)::text AS lifetime_redeemed
      FROM customers c
      WHERE c.user_id = $1
      `,
      [customerId],
    );
    return r.rows[0] ?? { points: 0, lifetime_earned: '0', lifetime_redeemed: '0' };
  }

  async listTransactions(customerId: string, query: { page: number; limit: number }) {
    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM loyalty_transactions WHERE customer_id = $1`,
      [customerId],
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    const offset = toOffset(query);
    const rowsRes = await this.db.query<LoyaltyTransactionRow>(
      `
      SELECT t.id::text, t.type, t.points, t.order_id, o.order_number,
             t.description, t.expires_at, t.created_at
      FROM loyalty_transactions t
      LEFT JOIN orders o ON o.id = t.order_id
      WHERE t.customer_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [customerId, query.limit, offset],
    );
    return { rows: rowsRes.rows, total };
  }

  async listRewards(): Promise<RewardRow[]> {
    const r = await this.db.query<RewardRow>(
      `
      SELECT id, name_ar, name_en, description_ar, description_en,
             points_cost, reward_type, reward_value, image_url,
             stock, used_count, is_active, sort_order
      FROM rewards
      WHERE is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at > now())
        AND (stock IS NULL OR stock > used_count)
      ORDER BY sort_order ASC, points_cost ASC
      `,
    );
    return r.rows;
  }

  async findRewardById(id: string): Promise<RewardRow | null> {
    const r = await this.db.query<RewardRow>(
      `SELECT * FROM rewards WHERE id = $1 LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  /**
   * إضافة نقاط (earn/adjust).
   */
  async addPoints(client: PoolClient | null, params: {
    customerId: string;
    type: string;
    points: number;
    orderId?: string;
    description?: string;
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<void> {
    const run = async (tx: PoolClient) => {
      const idempotentOrderEarn = params.type === 'earn' && !!params.orderId;
      const insertSql = `
        INSERT INTO loyalty_transactions (customer_id, type, points, order_id, description, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ${idempotentOrderEarn ? "ON CONFLICT (order_id) WHERE type = 'earn' AND order_id IS NOT NULL DO NOTHING" : ''}
        RETURNING id
      `;
      const inserted = await tx.query(insertSql, [
        params.customerId, params.type, params.points, params.orderId ?? null,
        params.description ?? null, params.expiresAt ?? null, params.createdBy ?? null,
      ]);
      // لا تحدّث الرصيد إذا كان ربح الطلب قد سُجّل مسبقاً.
      if (idempotentOrderEarn && inserted.rowCount === 0) return;
      await tx.query(`
        INSERT INTO customers (user_id, loyalty_points)
        VALUES ($2, $1)
        ON CONFLICT (user_id) DO UPDATE
        SET loyalty_points = customers.loyalty_points + EXCLUDED.loyalty_points,
            updated_at = now()
      `, [params.points, params.customerId]);
    };

    if (client) {
      await run(client);
    } else {
      await this.db.transaction(run);
    }
  }

  /**
   * استبدال (redeem) داخل transaction.
   */
  async redeem(
    customerId: string,
    reward: RewardRow,
    currency: string,
  ): Promise<{ transactionId: string; newBalance: number; pointsSpent: number }> {
    return this.db.transaction(async (client) => {
      // Lock the reward first so concurrent redemptions cannot exceed finite stock.
      const lockedReward = await client.query<{
        id: string; name_ar: string; points_cost: number;
        stock: number | null; used_count: number; is_active: boolean;
        starts_at: Date | null; expires_at: Date | null;
      }>(
        `SELECT id, name_ar, points_cost, stock, used_count, is_active, starts_at, expires_at
         FROM rewards WHERE id = $1 FOR UPDATE`,
        [reward.id],
      );
      const currentReward = lockedReward.rows[0];
      const now = new Date();
      if (!currentReward || !currentReward.is_active ||
          (currentReward.starts_at && currentReward.starts_at > now) ||
          (currentReward.expires_at && currentReward.expires_at <= now)) {
        throw new Error('REWARD_UNAVAILABLE');
      }
      if (currentReward.stock !== null && currentReward.used_count >= currentReward.stock) {
        throw new Error('REWARD_OUT_OF_STOCK');
      }

      // Lock the customer balance and use the authoritative reward cost.
      const bal = await client.query<{ loyalty_points: number }>(
        `SELECT loyalty_points FROM customers WHERE user_id = $1 FOR UPDATE`,
        [customerId],
      );
      const current = bal.rows[0]?.loyalty_points ?? 0;
      if (current < currentReward.points_cost) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      const tx = await client.query<{ id: string }>(
        `INSERT INTO loyalty_transactions (customer_id, type, points, reward_id, description)
         VALUES ($1, 'redeem', $2, $3, $4)
         RETURNING id::text`,
        [customerId, -currentReward.points_cost, currentReward.id, `Redeemed: ${currentReward.name_ar}`],
      );

      await client.query(
        `INSERT INTO customers (user_id, loyalty_points)
         VALUES ($2::uuid, 0)
         ON CONFLICT (user_id) DO UPDATE
         SET loyalty_points = GREATEST(0, customers.loyalty_points - $1::int),
             updated_at = now()`,
        [currentReward.points_cost, customerId],
      );

      await client.query(
        `UPDATE rewards SET used_count = used_count + 1 WHERE id = $1`,
        [currentReward.id],
      );

      const newBalance = current - currentReward.points_cost;
      return { transactionId: tx.rows[0].id, newBalance, pointsSpent: currentReward.points_cost };
    });
  }

  async createReward(actorId: string, dto: any): Promise<RewardRow> {
    const r = await this.db.query<RewardRow>(
      `
      INSERT INTO rewards (name_ar, name_en, description_ar, points_cost,
        reward_type, reward_value, image_url, stock, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        dto.nameAr, dto.nameEn, dto.descriptionAr ?? null,
        dto.pointsCost, dto.rewardType, dto.rewardValue,
        dto.imageUrl ?? null, dto.stock ?? null, dto.isActive ?? true,
      ],
    );
    return r.rows[0];
  }

  async getCurrency(): Promise<string> {
    const r = await this.db.query<{ value: any }>(
      `SELECT value FROM settings WHERE key = 'currency' LIMIT 1`,
    );
    const v = r.rows[0]?.value;
    return typeof v === 'string' ? v : 'YER';
  }
}
