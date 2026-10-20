import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';

@Injectable()
export class AdminRepository {
  constructor(private readonly db: DatabaseService) {}

  // ───── Dashboard ─────

  async getDashboard(): Promise<{
    total_users: string;
    active_users: string;
    total_stores: string;
    active_stores: string;
    total_drivers: string;
    active_drivers: string;
    total_orders: string;
    pending_orders: string;
    delivered_orders: string;
    cancelled_orders: string;
    total_revenue: string;
    today_orders: string;
    today_revenue: string;
  }> {
    const r = await this.db.query<{
      total_users: string;
      active_users: string;
      total_stores: string;
      active_stores: string;
      total_drivers: string;
      active_drivers: string;
      total_orders: string;
      pending_orders: string;
      delivered_orders: string;
      cancelled_orders: string;
      total_revenue: string;
      today_orders: string;
      today_revenue: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM users WHERE deleted_at IS NULL) AS total_users,
        (SELECT COUNT(*)::text FROM users WHERE status = 'active' AND deleted_at IS NULL) AS active_users,
        (SELECT COUNT(*)::text FROM stores WHERE deleted_at IS NULL) AS total_stores,
        (SELECT COUNT(*)::text FROM stores WHERE status = 'active' AND deleted_at IS NULL) AS active_stores,
        (SELECT COUNT(*)::text FROM drivers) AS total_drivers,
        (SELECT COUNT(*)::text FROM drivers WHERE status = 'active') AS active_drivers,
        (SELECT COUNT(*)::text FROM orders) AS total_orders,
        (SELECT COUNT(*)::text FROM orders WHERE status = 'pending') AS pending_orders,
        (SELECT COUNT(*)::text FROM orders WHERE status = 'delivered') AS delivered_orders,
        (SELECT COUNT(*)::text FROM orders WHERE status = 'cancelled') AS cancelled_orders,
        (SELECT COALESCE(SUM(total), 0)::text FROM orders WHERE status = 'delivered') AS total_revenue,
        (SELECT COUNT(*)::text FROM orders WHERE created_at >= CURRENT_DATE) AS today_orders,
        (SELECT COALESCE(SUM(total), 0)::text FROM orders WHERE created_at >= CURRENT_DATE AND status = 'delivered') AS today_revenue
    `);
    return r.rows[0];
  }

  // ───── Users ─────

  async listUsers(query: AdminUserQueryDto): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['u.deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      where.push(`u.status = $${i++}`);
      params.push(query.status);
    }
    if (query.search) {
      where.push(`(u.email ILIKE $${i} OR u.phone ILIKE $${i} OR u.full_name ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }
    if (query.roleCode) {
      where.push(`EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.code = $${i++}
      )`);
      params.push(query.roleCode);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users u ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        u.id, u.email, u.phone, u.full_name, u.status,
        COALESCE(
          (SELECT array_agg(r.code ORDER BY r.code)
           FROM user_roles ur JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = u.id),
          '{}'
        ) AS roles,
        u.last_login_at, u.created_at
      FROM users u
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findUserById(userId: string): Promise<any | null> {
    const r = await this.db.query(
      `
      SELECT
        u.id, u.email, u.phone, u.full_name, u.status, u.locale,
        u.email_verified_at, u.phone_verified_at, u.last_login_at, u.created_at,
        COALESCE(
          (SELECT array_agg(r.code ORDER BY r.code)
           FROM user_roles ur JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = u.id),
          '{}'
        ) AS roles
      FROM users u
      WHERE u.id = $1 AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );
    return r.rows[0] ?? null;
  }

  async updateUserStatus(userId: string, status: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE users SET status = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [status, userId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async findRoleByCode(code: string): Promise<{ id: number } | null> {
    const r = await this.db.query<{ id: number }>(
      `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
      [code],
    );
    return r.rows[0] ?? null;
  }

  async assignRole(userId: string, roleId: number, assignedBy: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, roleId, assignedBy],
    );
  }

  async removeRole(userId: string, roleCode: string): Promise<boolean> {
    const r = await this.db.query(
      `DELETE FROM user_roles
       WHERE user_id = $1
         AND role_id = (SELECT id FROM roles WHERE code = $2)`,
      [userId, roleCode],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async listRoles(): Promise<any[]> {
    const r = await this.db.query(
      `SELECT id, code, name_ar, name_en, description FROM roles ORDER BY id ASC`,
    );
    return r.rows;
  }

  // ───── Stores ─────

  async listStores(query: AdminUserQueryDto): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['s.deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      where.push(`s.status = $${i++}`);
      params.push(query.status);
    }
    if (query.search) {
      where.push(`(s.name_ar ILIKE $${i} OR s.name_en ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM stores s ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        s.id, s.name_ar, s.name_en, s.status, s.is_open,
        u.email AS owner_email,
        s.rating_avg, s.rating_count, s.created_at
      FROM stores s
      LEFT JOIN users u ON u.id = s.owner_user_id
      ${whereSql}
      ORDER BY s.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async updateStoreStatus(storeId: string, status: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE stores SET status = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [status, storeId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  // ───── Drivers ─────

  async listDrivers(query: AdminUserQueryDto): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      where.push(`d.status = $${i++}`);
      params.push(query.status);
    }
    if (query.search) {
      where.push(`(u.full_name ILIKE $${i} OR u.phone ILIKE $${i} OR u.email ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM drivers d JOIN users u ON u.id = d.user_id ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        d.user_id, u.full_name, u.email, u.phone,
        d.vehicle_type, d.status, d.availability,
        d.rating_avg, d.rating_count
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async updateDriverStatus(userId: string, status: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE drivers SET status = $1 WHERE user_id = $2`,
      [status, userId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  // ───── Orders ─────

  async listOrders(query: AdminOrderQueryDto): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      where.push(`o.status = $${i++}`);
      params.push(query.status);
    }
    if (query.search) {
      where.push(`(o.order_number ILIKE $${i} OR o.recipient_name ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders o ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.recipient_name AS customer_name,
        s.name_ar AS store_name,
        du.full_name AS driver_name,
        o.total, o.currency, o.created_at
      FROM orders o
      LEFT JOIN stores s ON s.id = o.store_id
      LEFT JOIN users du ON du.id = o.driver_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findOrderById(orderId: string): Promise<any | null> {
    const r = await this.db.query(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.recipient_name, o.recipient_phone,
        o.delivery_address_text, o.delivery_latitude, o.delivery_longitude,
        o.payment_method, o.payment_status, o.currency,
        o.subtotal, o.delivery_fee, o.discount_total, o.total,
        o.customer_notes, o.cancel_reason, o.reject_reason,
        o.placed_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at, o.cancelled_at,
        o.created_at,
        s.name_ar AS store_name,
        cu.full_name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
        du.full_name AS driver_name, du.phone AS driver_phone
      FROM orders o
      LEFT JOIN stores s ON s.id = o.store_id
      LEFT JOIN users cu ON cu.id = o.customer_id
      LEFT JOIN users du ON du.id = o.driver_id
      WHERE o.id = $1
      LIMIT 1
      `,
      [orderId],
    );
    return r.rows[0] ?? null;
  }

  // ───── Audit Logs ─────

  async listAuditLogs(query: AdminUserQueryDto): Promise<{ rows: any[]; total: number }> {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (query.search) {
      where.push(`(action ILIKE $${i} OR entity_type ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query(
      `
      SELECT id, actor_user_id, actor_role, action, entity_type, entity_id,
             ip_address, created_at
      FROM audit_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  // ───── Audit Helper ─────

  async writeAuditLog(params: {
    actorUserId: string;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.db.query(
      `
      INSERT INTO audit_logs
        (actor_user_id, actor_role, action, entity_type, entity_id,
         old_value, new_value, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        params.actorUserId,
        params.actorRole ?? null,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.oldValue ? JSON.stringify(params.oldValue) : null,
        params.newValue ? JSON.stringify(params.newValue) : null,
        params.ip ?? null,
        params.userAgent ?? null,
      ],
    );
  }

  /**
   * إلغاء الطلب من قبل الإدارة (transaction).
   */
  async cancelOrderAsAdmin(
    orderId: string,
    actorId: string,
    reasonCode: string,
    note: string | null,
  ): Promise<any | null> {
    return this.db.transaction(async (client) => {
      const cur = await client.query<{ status: string }>(
        `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      const current = cur.rows[0];
      if (!current) return null;

      const upd = await client.query(
        `
        UPDATE orders
        SET status = 'cancelled_by_admin',
            cancelled_at = now(),
            cancelled_by = $1,
            cancellation_actor = 'admin',
            cancellation_reason_code = $2::cancellation_reason,
            cancellation_note = $3,
            cancel_reason = $4
        WHERE id = $5
        RETURNING *
        `,
        [actorId, reasonCode, note, note ?? reasonCode, orderId],
      );

      await client.query(
        `
        INSERT INTO order_status_history
          (order_id, from_status, to_status, changed_by, actor_role, note)
        VALUES ($1, $2, 'cancelled_by_admin', $3, 'admin', $4)
        `,
        [orderId, current.status, actorId, note ?? reasonCode],
      );

      return upd.rows[0] ?? null;
    });
  }
}
