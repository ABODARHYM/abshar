import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { PaginationQueryDto, toOffset } from '../../common/pagination.dto';
import {
  NotificationRow,
  CreateNotificationInput,
  PushSubscriptionRow,
} from './notifications.types';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DatabaseService) {}

  // ═══════════════════════════════════════════════════
  // NEW API (PHASE 8)
  // ═══════════════════════════════════════════════════
  async create(
    client: PoolClient | null,
    input: CreateNotificationInput,
  ): Promise<NotificationRow> {
    const sql = `
      INSERT INTO notifications
        (user_id, title, body, type, category, priority, icon, action_url, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const params = [
      input.userId,
      input.title,
      input.body,
      input.type ?? 'info',
      input.category ?? 'general',
      input.priority ?? 'normal',
      input.icon ?? null,
      input.actionUrl ?? null,
      JSON.stringify(input.metadata ?? {}),
    ];
    const exec = client
      ? (s: string, p: any[]) => client.query(s, p)
      : (s: string, p: any[]) => this.db.query(s, p);
    const r = await exec(sql, params);
    return r.rows[0];
  }

  async listMine(
    userId: string,
    q: PaginationQueryDto & { category?: string; unreadOnly?: boolean },
  ): Promise<{ rows: NotificationRow[]; total: number; unreadCount: number }> {
    const filters: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (q.category) {
      filters.push(`category = $${idx++}`);
      params.push(q.category);
    }
    if (q.unreadOnly) {
      filters.push(`is_read = false`);
    }

    const where = filters.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const limit = q.limit ?? 20;
    const offset = toOffset(q);

    const rows = await this.db.query<NotificationRow>(
      `
      SELECT * FROM notifications
      WHERE ${where}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
      `,
      [...params, limit, offset],
    );

    const unreadCount = await this.unreadCount(userId);

    return { rows: rows.rows, total, unreadCount };
  }

  async unreadCount(userId: string): Promise<number> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return parseInt(r.rows[0]?.count ?? '0', 10);
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE notifications SET is_read = true, read_at = now()
       WHERE id = $1 AND user_id = $2 AND is_read = false`,
      [id, userId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const r = await this.db.query(
      `UPDATE notifications SET is_read = true, read_at = now()
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return r.rowCount ?? 0;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const r = await this.db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  // ═══════════════════════════════════════════════════
  // LEGACY API — يطابق النسخة القديمة
  // ═══════════════════════════════════════════════════
  async list(
    userId: string,
    query: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{ rows: NotificationRow[]; total: number; unreadCount: number }> {
    return this.listMine(userId, {
      sortOrder: "desc",
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
  }

  async markAsRead(userId: string, id: string): Promise<boolean> {
    return this.markRead(userId, id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.markAllRead(userId);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    return this.delete(userId, id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.unreadCount(userId);
  }

  async deleteByOrderAndType(orderId: string, type: string): Promise<number> {
    const r = await this.db.query(
      `DELETE FROM notifications
       WHERE type = $2 AND (metadata->>'orderId') = $1`,
      [orderId, type],
    );
    return r.rowCount ?? 0;
  }

  async getAvailableDriversForStore(
    storeId: string,
    limit: number,
  ): Promise<{ user_id: string }[]> {
    // ابحث عن مندوبين متاحين في نفس مدينة المتجر
    const r = await this.db.query<{ user_id: string }>(
      `
      SELECT DISTINCT d.user_id
      FROM drivers d
      JOIN stores s ON s.id = $1
      WHERE d.is_available = true
        AND d.status = 'active'
      LIMIT $2
      `,
      [storeId, limit],
    );
    return r.rows;
  }

  // ═══════════════════════════════════════════════════
  // PUSH SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════
  async savePushSubscription(
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
  ): Promise<PushSubscriptionRow> {
    // endpoint = متصفح/جهاز واحد. عند اشتراك مستخدم جديد من نفس الجهاز نعطّل اشتراك أي مستخدم سابق
    // حتى لا تصل إشعارات المستخدم السابق (طلباته/عناوينه) إلى من يستخدم الجهاز الآن.
    const r = await this.db.query<PushSubscriptionRow>(
      `
      WITH released AS (
        UPDATE push_subscriptions
           SET is_active = false, updated_at = now()
         WHERE endpoint = $2 AND user_id <> $1 AND is_active = true
      )
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, endpoint) DO UPDATE
      SET p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent,
          is_active = true,
          updated_at = now()
      RETURNING *
      `,
      [userId, data.endpoint, data.p256dh, data.auth, data.userAgent ?? null],
    );
    return r.rows[0];
  }

  async listPushSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
    const r = await this.db.query<PushSubscriptionRow>(
      `SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true`,
      [userId],
    );
    return r.rows;
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.db.query(
      `UPDATE push_subscriptions SET is_active = false, updated_at = now()
       WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint],
    );
  }

  async markPushUsed(endpoint: string): Promise<void> {
    await this.db.query(
      `UPDATE push_subscriptions SET last_used_at = now() WHERE endpoint = $1`,
      [endpoint],
    );
  }

  // ═══════════════════════════════════════════════════
  // DEVICE TOKENS
  // ═══════════════════════════════════════════════════
  async saveDeviceToken(
    userId: string,
    token: string,
    platform: 'web' | 'android' | 'ios',
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO device_tokens (user_id, token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          platform = EXCLUDED.platform,
          is_active = true,
          updated_at = now()
      `,
      [userId, token, platform],
    );
  }
}
