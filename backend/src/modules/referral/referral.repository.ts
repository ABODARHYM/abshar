import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { PaginationQueryDto, toOffset } from '../../common/pagination.dto';
import {
  ReferralRow,
  ReferralWithUsersRow,
  ReferralStatsRow,
  MyCodeRow,
} from './referral.types';

@Injectable()
export class ReferralRepository {
  constructor(private readonly db: DatabaseService) {}

  // ═══ Code ═══
  async ensureMyCode(userId: string): Promise<string> {
    const r = await this.db.query<MyCodeRow>(
      `
      UPDATE customers
      SET referral_code = COALESCE(
            referral_code,
            UPPER(SUBSTRING(MD5(RANDOM()::text || user_id::text) FROM 1 FOR 8))
          )
      WHERE user_id = $1
      RETURNING referral_code
      `,
      [userId],
    );
    return r.rows[0].referral_code;
  }

  async findByCode(code: string): Promise<{ user_id: string } | null> {
    const r = await this.db.query<{ user_id: string }>(
      `SELECT user_id FROM customers WHERE referral_code = $1`,
      [code.toUpperCase()],
    );
    return r.rows[0] ?? null;
  }

  // ═══ Checks ═══
  async findExistingReferral(referredId: string): Promise<ReferralRow | null> {
    const r = await this.db.query<ReferralRow>(
      `SELECT * FROM referrals WHERE referred_id = $1`,
      [referredId],
    );
    return r.rows[0] ?? null;
  }

  async hasUserOrdered(userId: string): Promise<boolean> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders WHERE customer_id = $1`,
      [userId],
    );
    return parseInt(r.rows[0]?.count ?? '0', 10) > 0;
  }

  // ═══ Create ═══
  async createReferral(
    client: PoolClient | null,
    data: {
      referrerId: string;
      referredId: string;
      code: string;
      rewardPoints: number;
    },
  ): Promise<ReferralRow> {
    const sql = `
      INSERT INTO referrals (referrer_id, referred_id, code, status, reward_points)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *
    `;
    const params = [data.referrerId, data.referredId, data.code, data.rewardPoints];
    const exec = client
      ? (s: string, p: any[]) => client.query(s, p)
      : (s: string, p: any[]) => this.db.query(s, p);
    const r = await exec(sql, params);
    return r.rows[0];
  }

  async markCompleted(client: PoolClient | null, referralId: string): Promise<void> {
    const sql = `
      UPDATE referrals
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'pending'
    `;
    const exec = client
      ? (s: string, p: any[]) => client.query(s, p)
      : (s: string, p: any[]) => this.db.query(s, p);
    await exec(sql, [referralId]);
  }

  async markRewarded(client: PoolClient | null, referralId: string): Promise<void> {
    const sql = `
      UPDATE referrals
      SET status = 'rewarded', rewarded_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'completed'
    `;
    const exec = client
      ? (s: string, p: any[]) => client.query(s, p)
      : (s: string, p: any[]) => this.db.query(s, p);
    await exec(sql, [referralId]);
  }

  async cancel(client: PoolClient | null, referralId: string): Promise<void> {
    const sql = `
      UPDATE referrals
      SET status = 'cancelled', updated_at = now()
      WHERE id = $1 AND status IN ('pending','completed')
    `;
    const exec = client
      ? (s: string, p: any[]) => client.query(s, p)
      : (s: string, p: any[]) => this.db.query(s, p);
    await exec(sql, [referralId]);
  }

  // ═══ Stats ═══
  async getMyStats(userId: string): Promise<ReferralStatsRow> {
    const r = await this.db.query<ReferralStatsRow>(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::text   AS pending,
        COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
        COUNT(*) FILTER (WHERE status = 'rewarded')::text  AS rewarded,
        COALESCE(SUM(reward_points) FILTER (WHERE status = 'rewarded'), 0)::text AS total_points_earned
      FROM referrals
      WHERE referrer_id = $1
      `,
      [userId],
    );
    return r.rows[0];
  }

  // ═══ Invites ═══
  async listMyInvites(
    userId: string,
    q: PaginationQueryDto,
  ): Promise<{ rows: ReferralWithUsersRow[]; total: number }> {
    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM referrals WHERE referrer_id = $1`,
      [userId],
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    const offset = toOffset(q);

    const rowsRes = await this.db.query<ReferralWithUsersRow>(
      `
      SELECT
        r.*,
        u1.full_name AS referrer_name,
        u1.email     AS referrer_email,
        u2.full_name AS referred_name,
        u2.email     AS referred_email
      FROM referrals r
      JOIN users u1 ON u1.id = r.referrer_id
      JOIN users u2 ON u2.id = r.referred_id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, q.limit, offset],
    );
    return { rows: rowsRes.rows, total };
  }

  // ═══ Admin ═══
  async listAll(
    q: PaginationQueryDto,
    status?: string,
  ): Promise<{ rows: ReferralWithUsersRow[]; total: number }> {
    const offset = toOffset(q);
    const countSql = status
      ? `SELECT COUNT(*)::text AS count FROM referrals WHERE status = $1`
      : `SELECT COUNT(*)::text AS count FROM referrals`;
    const countParams = status ? [status] : [];
    const countRes = await this.db.query<{ count: string }>(countSql, countParams);
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const whereClause = status ? `WHERE r.status = $3` : '';
    const params: any[] = [q.limit, offset];
    if (status) params.push(status);

    const rowsRes = await this.db.query<ReferralWithUsersRow>(
      `
      SELECT
        r.*,
        u1.full_name AS referrer_name,
        u1.email     AS referrer_email,
        u2.full_name AS referred_name,
        u2.email     AS referred_email
      FROM referrals r
      JOIN users u1 ON u1.id = r.referrer_id
      JOIN users u2 ON u2.id = r.referred_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      params,
    );
    return { rows: rowsRes.rows, total };
  }

  async findById(id: string): Promise<ReferralRow | null> {
    const r = await this.db.query<ReferralRow>(
      `SELECT * FROM referrals WHERE id = $1`,
      [id],
    );
    return r.rows[0] ?? null;
  }
}
