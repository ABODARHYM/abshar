import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';

export interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: string | number;
  min_order_amount: string | number;
  max_discount_amount: string | number | null;
  starts_at: Date | null;
  expires_at: Date | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  store_id: string | null;
  category_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CouponsRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(query: { page: number; limit: number; isActive?: boolean }): Promise<{
    rows: CouponRow[];
    total: number;
  }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.isActive !== undefined) {
      where.push(`is_active = $${i++}`);
      params.push(query.isActive);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM coupons ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query<CouponRow>(
      `SELECT * FROM coupons ${whereSql} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findByCode(code: string): Promise<CouponRow | null> {
    const r = await this.db.query<CouponRow>(
      `SELECT * FROM coupons WHERE code = $1::citext LIMIT 1`,
      [code],
    );
    return r.rows[0] ?? null;
  }

  async findById(id: string): Promise<CouponRow | null> {
    const r = await this.db.query<CouponRow>(
      `SELECT * FROM coupons WHERE id = $1 LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async countUserUsage(couponId: string, userId: string): Promise<number> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2`,
      [couponId, userId],
    );
    return parseInt(r.rows[0]?.count ?? '0', 10);
  }

  /**
   * تسجيل استخدام الكوبون — process مباشر بدون transaction خارجي.
   */
  async insertUsageInTransaction(
    userId: string,
    couponId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)`,
      [couponId, userId, orderId, discountAmount],
    );
    await this.db.query(
      `UPDATE coupons SET used_count = used_count + 1, updated_at = now() WHERE id = $1`,
      [couponId],
    );
  }

  async insertUsage(
    client: PoolClient,
    params: {
      couponId: string;
      userId: string;
      orderId: string;
      discountAmount: number;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)`,
      [params.couponId, params.userId, params.orderId, params.discountAmount],
    );
    await client.query(
      `UPDATE coupons SET used_count = used_count + 1, updated_at = now() WHERE id = $1`,
      [params.couponId],
    );
  }

  async create(
    data: Partial<CouponRow> & { code: string; type: string; value: number },
    createdBy: string,
  ): Promise<CouponRow> {
    const r = await this.db.query<CouponRow>(
      `
      INSERT INTO coupons (
        code, type, value, min_order_amount, max_discount_amount,
        starts_at, expires_at, usage_limit, per_user_limit,
        store_id, category_id, is_active, created_by
      )
      VALUES ($1::citext, $2::discount_type, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
      `,
      [
        data.code,
        data.type,
        data.value,
        data.min_order_amount ?? 0,
        data.max_discount_amount ?? null,
        data.starts_at ?? null,
        data.expires_at ?? null,
        data.usage_limit ?? null,
        data.per_user_limit ?? null,
        data.store_id ?? null,
        data.category_id ?? null,
        data.is_active ?? true,
        createdBy,
      ],
    );
    return r.rows[0];
  }

  async update(id: string, fields: Record<string, unknown>): Promise<CouponRow | null> {
    const map: Record<string, string> = {
      code: 'code',
      type: 'type',
      value: 'value',
      minOrderAmount: 'min_order_amount',
      maxDiscountAmount: 'max_discount_amount',
      startsAt: 'starts_at',
      expiresAt: 'expires_at',
      usageLimit: 'usage_limit',
      perUserLimit: 'per_user_limit',
      storeId: 'store_id',
      categoryId: 'category_id',
      isActive: 'is_active',
    };

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if (fields[key] !== undefined) {
        const cast = (col === 'code') ? '::citext' : (col === 'type') ? '::discount_type' : '';
        sets.push(`${col} = $${i++}${cast}`);
        params.push(fields[key]);
      }
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    const r = await this.db.query<CouponRow>(
      `UPDATE coupons SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
      params,
    );
    return r.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE coupons SET is_active = false, updated_at = now() WHERE id = $1`,
      [id],
    );
    return (r.rowCount ?? 0) > 0;
  }
}
