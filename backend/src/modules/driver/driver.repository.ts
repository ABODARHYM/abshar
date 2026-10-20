import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
import { DriverOrderQueryDto } from './dto/driver-order-query.dto';

export interface DriverRow {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  status: string;
  availability: string;
  rating_avg: string | number;
  rating_count: number;
  last_latitude: string | number | null;
  last_longitude: string | number | null;
  last_location_at: Date | null;
}

export interface DriverOrderRow {
  id: string;
  order_number: string;
  status: string;
  store_id: string;
  store_name: string | null;
  store_address_text: string;
  store_latitude: string | number;
  store_longitude: string | number;
  store_phone: string | null;
  customer_id: string;
  customer_name: string | null;
  recipient_name: string;
  recipient_phone: string;
  delivery_address_text: string;
  delivery_latitude: string | number;
  delivery_longitude: string | number;
  payment_method: string;
  currency: string;
  subtotal: string | number;
  delivery_fee: string | number;
  total: string | number;
  customer_notes: string | null;
  driver_id: string | null;
  placed_at: Date | null;
  accepted_at: Date | null;
  ready_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
}

export interface DriverOrderItemRow {
  id: string;
  product_name: string;
  variant_name: string | null;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
  notes: string | null;
}

@Injectable()
export class DriverRepository {
  constructor(private readonly db: DatabaseService) {}

  // ───── Driver Profile ─────

  async findDriverByUserId(userId: string): Promise<DriverRow | null> {
    const r = await this.db.query<DriverRow>(
      `
      SELECT
        d.user_id,
        u.full_name,
        u.email,
        u.phone,
        d.vehicle_type,
        d.vehicle_plate,
        d.status,
        d.availability,
        d.rating_avg,
        d.rating_count,
        d.last_latitude,
        d.last_longitude,
        d.last_location_at
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1 AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );
    return r.rows[0] ?? null;
  }

  async updateAvailability(
    userId: string,
    availability: string,
  ): Promise<DriverRow | null> {
    await this.db.query(
      `UPDATE drivers SET availability = $1 WHERE user_id = $2`,
      [availability, userId],
    );
    return this.findDriverByUserId(userId);
  }

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.db.query(
      `UPDATE drivers SET last_latitude = $1, last_longitude = $2, last_location_at = now() WHERE user_id = $3`,
      [latitude, longitude, userId],
    );
  }

  async insertLocationHistory(
    userId: string,
    orderId: string | null,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, recorded_at)
      VALUES ($1, $2, $3, $4, now())
      `,
      [userId, orderId, latitude, longitude],
    );
  }

  // ───── Available Orders (ready + unassigned) ─────

  async listAvailableOrders(
    query: DriverOrderQueryDto,
  ): Promise<{ rows: DriverOrderRow[]; total: number }> {
    const where: string[] = [
      "o.status = 'ready'",
      'o.driver_id IS NULL',
    ];
    const params: unknown[] = [];
    let i = 1;

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
    const rowsRes = await this.db.query<DriverOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.store_id, s.name_ar AS store_name,
        s.address_text AS store_address_text,
        s.latitude AS store_latitude,
        s.longitude AS store_longitude,
        s.phone AS store_phone,
        o.customer_id, u.full_name AS customer_name,
        o.recipient_name, o.recipient_phone,
        o.delivery_address_text,
        o.delivery_latitude, o.delivery_longitude,
        o.payment_method, o.currency,
        o.subtotal, o.delivery_fee, o.total,
        o.customer_notes, o.driver_id,
        o.placed_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
        o.created_at
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN users u ON u.id = o.customer_id
      ${whereSql}
      ORDER BY o.ready_at ASC NULLS LAST, o.created_at ASC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }


  /**
   * تسجيل رفض عرض Smart Dispatch للمندوب.
   *
   * لا نحذف assignment حتى تبقى هناك ذاكرة تاريخية للرفض،
   * ويستطيع Smart Dispatch استبعاد نفس المندوب في الجولة التالية.
   */
  async rejectOffer(
    orderId: string,
    driverId: string,
  ): Promise<{ rejected: boolean; reason?: string }> {
    return this.db.transaction(async (client: PoolClient) => {
      const orderRes = await client.query<{
        status: string;
        driver_id: string | null;
        order_number: string;
      }>(
        `
        SELECT status, driver_id, order_number
        FROM orders
        WHERE id = $1
        FOR UPDATE
        `,
        [orderId],
      );

      const order = orderRes.rows[0];

      if (!order) {
        return {
          rejected: false,
          reason: 'ORDER_NOT_FOUND',
        };
      }

      if (order.driver_id && order.driver_id !== driverId) {
        return {
          rejected: false,
          reason: 'ALREADY_TAKEN',
        };
      }

      if (order.status !== 'ready' || order.driver_id !== null) {
        return {
          rejected: false,
          reason: 'ORDER_NOT_AVAILABLE',
        };
      }

      const result = await client.query(
        `
        UPDATE driver_assignments
        SET status = 'rejected',
            responded_at = now()
        WHERE order_id = $1
          AND driver_id = $2
          AND status = 'offered'
          AND (expires_at IS NULL OR expires_at > now())
        RETURNING id
        `,
        [orderId, driverId],
      );

      if (result.rowCount === 0) {
        /*
         * لا يوجد عرض active لهذا المندوب.
         * قد يكون الطلب ظهر في قائمة الطلبات العامة وليس كعرض Smart Dispatch.
         */
        const historical = await client.query(
          `
          SELECT id
          FROM driver_assignments
          WHERE order_id = $1
            AND driver_id = $2
          LIMIT 1
          `,
          [orderId, driverId],
        );

        if ((historical.rowCount ?? 0) > 0) {
          return {
            rejected: false,
            reason: 'ALREADY_REJECTED',
          };
        }

        return {
          rejected: false,
          reason: 'OFFER_NOT_FOUND',
        };
      }

      return {
        rejected: true,
      };
    });
  }

  /**
   * منع ظهور الطلبات التي سبق لهذا المندوب رفضها.
   */
  async listAvailableOrdersForDriver(
    driverId: string,
    query: DriverOrderQueryDto,
  ): Promise<{ rows: DriverOrderRow[]; total: number }> {
    const where: string[] = [
      "o.status = 'ready'",
      'o.driver_id IS NULL',
      `
      NOT EXISTS (
        SELECT 1
        FROM driver_assignments da_rejected
        WHERE da_rejected.order_id = o.id
          AND da_rejected.driver_id = $1
          AND da_rejected.status = 'rejected'
      )
      `,
    ];

    const params: unknown[] = [driverId];
    let i = 2;

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

    const rowsRes = await this.db.query<DriverOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.store_id, s.name_ar AS store_name,
        s.address_text AS store_address_text,
        s.latitude AS store_latitude,
        s.longitude AS store_longitude,
        s.phone AS store_phone,
        o.customer_id, u.full_name AS customer_name,
        o.recipient_name, o.recipient_phone,
        o.delivery_address_text,
        o.delivery_latitude, o.delivery_longitude,
        o.payment_method, o.currency,
        o.subtotal, o.delivery_fee, o.total,
        o.customer_notes, o.driver_id,
        o.placed_at, o.accepted_at, o.ready_at,
        o.picked_up_at, o.delivered_at,
        o.created_at
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN users u ON u.id = o.customer_id
      ${whereSql}
      ORDER BY o.ready_at ASC NULLS LAST, o.created_at ASC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return {
      rows: rowsRes.rows,
      total,
    };
  }

  /**
   * معلومات الطلب اللازمة لإعادة تشغيل Smart Dispatch بعد الرفض.
   */
  async getDispatchInfo(orderId: string): Promise<{
    orderId: string;
    orderNumber: string;
    storeId: string;
    deliveryArea: string;
  } | null> {
    const r = await this.db.query<{
      order_id: string;
      order_number: string;
      store_id: string;
      delivery_area: string | null;
    }>(
      `
      SELECT
        o.id AS order_id,
        o.order_number,
        o.store_id,
        o.delivery_address_text AS delivery_area
      FROM orders o
      WHERE o.id = $1
      LIMIT 1
      `,
      [orderId],
    );

    const row = r.rows[0];

    if (!row) return null;

    return {
      orderId: row.order_id,
      orderNumber: row.order_number,
      storeId: row.store_id,
      deliveryArea: row.delivery_area ?? '',
    };
  }

  // ───── My Orders (assigned to me, in progress) ─────

  async listMyOrders(
    driverId: string,
    query: DriverOrderQueryDto,
  ): Promise<{ rows: DriverOrderRow[]; total: number }> {
    const where: string[] = [
      'o.driver_id = $1',
      "o.status IN ('driverAssigned','driverGoingToStore','driverArrivedStore','pickedUp','driverGoingToCustomer','driverArrivedCustomer')",
    ];
    const params: unknown[] = [driverId];
    let i = 2;

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
    const rowsRes = await this.db.query<DriverOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.store_id, s.name_ar AS store_name,
        s.address_text AS store_address_text,
        s.latitude AS store_latitude,
        s.longitude AS store_longitude,
        s.phone AS store_phone,
        o.customer_id, u.full_name AS customer_name,
        o.recipient_name, o.recipient_phone,
        o.delivery_address_text,
        o.delivery_latitude, o.delivery_longitude,
        o.payment_method, o.currency,
        o.subtotal, o.delivery_fee, o.total,
        o.customer_notes, o.driver_id,
        o.placed_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
        o.created_at
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN users u ON u.id = o.customer_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findOrderForDriver(
    orderId: string,
    driverId: string | null,
  ): Promise<DriverOrderRow | null> {
    const params: unknown[] = [orderId];
    let where = 'WHERE o.id = $1';
    if (driverId) {
      params.push(driverId);
      where += ' AND o.driver_id = $2';
    }
    const r = await this.db.query<DriverOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.status,
        o.store_id, s.name_ar AS store_name,
        s.address_text AS store_address_text,
        s.latitude AS store_latitude,
        s.longitude AS store_longitude,
        s.phone AS store_phone,
        o.customer_id, u.full_name AS customer_name,
        o.recipient_name, o.recipient_phone,
        o.delivery_address_text,
        o.delivery_latitude, o.delivery_longitude,
        o.payment_method, o.currency,
        o.subtotal, o.delivery_fee, o.total,
        o.customer_notes, o.driver_id,
        o.placed_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
        o.created_at
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN users u ON u.id = o.customer_id
      ${where}
      LIMIT 1
      `,
      params,
    );
    return r.rows[0] ?? null;
  }

  async listOrderItems(orderId: string): Promise<DriverOrderItemRow[]> {
    const r = await this.db.query<DriverOrderItemRow>(
      `
      SELECT id, product_name, variant_name, unit_price, quantity, line_total, notes
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
      `,
      [orderId],
    );
    return r.rows;
  }

  /**
   * قبول مهمة: يشترط أن الطلب status='ready' و driver_id IS NULL
   * و driver status='active' و availability في ('online','busy')
   * داخل transaction مع FOR UPDATE لمنع التزامن.
   */
  async acceptOrder(
    orderId: string,
    driverId: string,
  ): Promise<DriverOrderRow | null> {
    return this.db.transaction(async (client: PoolClient) => {
      // 1) اقفل الطلب
      const cur = await client.query<{ status: string; driver_id: string | null }>(
        `SELECT status, driver_id FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      const order = cur.rows[0];
      if (!order) return null;
      if (order.status !== 'ready' || order.driver_id !== null) return null;

      // 2) اقفل السائق
      const drv = await client.query<{ status: string }>(
        `SELECT status FROM drivers WHERE user_id = $1 FOR UPDATE`,
        [driverId],
      );
      if (!drv.rows[0] || drv.rows[0].status !== 'active') return null;

      // 3) حدّث الطلب
      const upd = await client.query<DriverOrderRow>(
        `
        UPDATE orders
        SET driver_id = $1, status = 'driverAssigned'
        WHERE id = $2
        RETURNING
          id, order_number, status,
          store_id, NULL::text AS store_name,
          ''::varchar AS store_address_text,
          0::numeric AS store_latitude,
          0::numeric AS store_longitude,
          NULL::varchar AS store_phone,
          customer_id, NULL::text AS customer_name,
          recipient_name, recipient_phone,
          delivery_address_text,
          delivery_latitude, delivery_longitude,
          payment_method, currency,
          subtotal, delivery_fee, total,
          customer_notes, driver_id,
          placed_at, accepted_at, ready_at, picked_up_at, delivered_at,
          created_at
        `,
        [driverId, orderId],
      );

      // 4) history
      await client.query(
        `
        INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, actor_role, note)
        VALUES ($1, 'ready', 'driverAssigned', $2, 'driver', 'تم قبول الطلب من المندوب')
        `,
        [orderId, driverId],
      );

      // 5) تحديث availability
      await client.query(
        `UPDATE drivers SET availability = 'busy' WHERE user_id = $1`,
        [driverId],
      );

      // 6) سجّل الإسناد
      // 6a) احذف كل العروض الأخرى (للمندوبين الآخرين)
      await client.query(
        `DELETE FROM driver_assignments WHERE order_id = $1 AND status = 'offered' AND driver_id <> $2`,
        [orderId, driverId],
      );

      // 6b) حدّث عرض المندوب الحالي من offered → accepted
      const updAssign = await client.query(
        `UPDATE driver_assignments
         SET status = 'accepted', mode = 'manual', responded_at = now()
         WHERE order_id = $1 AND driver_id = $2 AND status = 'offered'`,
        [orderId, driverId],
      );

      // 6c) إذا لم يوجد عرض مسبق، أنشئ واحدًا جديدًا
      if ((updAssign.rowCount ?? 0) === 0) {
        await client.query(
          `INSERT INTO driver_assignments (order_id, driver_id, status, mode, responded_at)
           VALUES ($1, $2, 'accepted', 'manual', now())`,
          [orderId, driverId],
        );
      }

      return upd.rows[0] ?? null;
    });
  }

  /**
   * تغيير حالة الطلب من قبل السائق.
   * القيود: الطلب يجب أن يكون مُسندًا للسائق، وحالته الحالية مسموحة.
   */
  async transitionOrderStatus(
    orderId: string,
    driverId: string,
    expectedFrom: string[],
    toStatus: string,
    note?: string,
    cancellation?: {
      actor: 'customer' | 'store' | 'driver' | 'admin' | 'system';
      reasonCode: string;
    },
  ): Promise<DriverOrderRow | null> {
    return this.db.transaction(async (client: PoolClient) => {
      const cur = await client.query<{ status: string; driver_id: string | null }>(
        `SELECT status, driver_id FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      const o = cur.rows[0];
      if (!o) return null;
      if (o.driver_id !== driverId) return null;
      if (!expectedFrom.includes(o.status)) {
        throw new Error(
          `Cannot transition from "${o.status}" to "${toStatus}"`,
        );
      }

      const updates: string[] = ['status = $1'];
      const params: unknown[] = [toStatus];
      let i = 2;

      if (toStatus === 'pickedUp') updates.push(`picked_up_at = now()`);
      if (toStatus === 'delivered') {
        updates.push(`delivered_at = now()`);
        updates.push(`payment_status = 'paid'`);
      }

      // ✨ الإلغاء الجديد
      if (toStatus.startsWith('cancelled_by_') || toStatus === 'cancelled') {
        updates.push(`cancelled_at = COALESCE(cancelled_at, now())`);
        updates.push(`cancelled_by = COALESCE(cancelled_by, $${i++}::uuid)`);
        params.push(driverId);

        if (cancellation) {
          updates.push(`cancellation_actor = $${i++}::cancellation_actor`);
          params.push(cancellation.actor);

          updates.push(`cancellation_reason_code = $${i++}::cancellation_reason`);
          params.push(cancellation.reasonCode);

          updates.push(`cancellation_note = $${i++}`);
          params.push(note ?? null);

          updates.push(`cancel_reason = $${i++}`);
          params.push(note ?? cancellation.reasonCode);
        }
      }

      params.push(orderId, driverId);
      const upd = await client.query<DriverOrderRow>(
        `
        UPDATE orders SET ${updates.join(', ')}
        WHERE id = $${i++} AND driver_id = $${i}
        RETURNING
          id, order_number, status,
          store_id, NULL::text AS store_name,
          ''::varchar AS store_address_text,
          0::numeric AS store_latitude,
          0::numeric AS store_longitude,
          NULL::varchar AS store_phone,
          customer_id, NULL::text AS customer_name,
          recipient_name, recipient_phone,
          delivery_address_text,
          delivery_latitude, delivery_longitude,
          payment_method, currency,
          subtotal, delivery_fee, total,
          customer_notes, driver_id,
          placed_at, accepted_at, ready_at, picked_up_at, delivered_at,
          created_at
        `,
        params,
      );

      await client.query(
        `
        INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, actor_role, note)
        VALUES ($1, $2, $3, $4, 'driver', $5)
        `,
        [orderId, o.status, toStatus, driverId, note ?? null],
      );

      // عند التسليم: حرّر السائق
      if (toStatus === 'delivered') {
        await client.query(
          `UPDATE drivers SET availability = 'online' WHERE user_id = $1`,
          [driverId],
        );
        await client.query(
          `UPDATE driver_assignments SET status = 'completed' WHERE order_id = $1 AND driver_id = $2 AND status = 'accepted'`,
          [orderId, driverId],
        );
      }

      return upd.rows[0] ?? null;
    });
  }

  // ───── Earnings ─────

  async getEarnings(driverId: string): Promise<{
    total_earnings: string;
    total_deliveries: string;
    today_earnings: string;
    today_deliveries: string;
    week_earnings: string;
    week_deliveries: string;
    month_earnings: string;
    month_deliveries: string;
  }> {
    // أرباح السائق = delivery_fee عن كل طلب مُسلَّم
    const r = await this.db.query<{
      total_earnings: string;
      total_deliveries: string;
      today_earnings: string;
      today_deliveries: string;
      week_earnings: string;
      week_deliveries: string;
      month_earnings: string;
      month_deliveries: string;
    }>(
      `
      SELECT
        COALESCE(SUM(delivery_fee), 0)::text AS total_earnings,
        COUNT(*)::text AS total_deliveries,
        COALESCE(SUM(CASE WHEN delivered_at >= CURRENT_DATE THEN delivery_fee ELSE 0 END), 0)::text AS today_earnings,
        COUNT(CASE WHEN delivered_at >= CURRENT_DATE THEN 1 END)::text AS today_deliveries,
        COALESCE(SUM(CASE WHEN delivered_at >= CURRENT_DATE - INTERVAL '7 days' THEN delivery_fee ELSE 0 END), 0)::text AS week_earnings,
        COUNT(CASE WHEN delivered_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::text AS week_deliveries,
        COALESCE(SUM(CASE WHEN delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN delivery_fee ELSE 0 END), 0)::text AS month_earnings,
        COUNT(CASE WHEN delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::text AS month_deliveries
      FROM orders
      WHERE driver_id = $1 AND status = 'delivered'
      `,
      [driverId],
    );
    return r.rows[0];
  }
}
