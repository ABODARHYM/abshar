import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
import { StoreOrderQueryDto } from './dto/store-order-query.dto';

export interface MyStoreRow {
  id: string;
  owner_user_id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  address_text: string;
  latitude: string | number;
  longitude: string | number;
  status: string;
  is_open: boolean;
  accepts_orders: boolean;
  min_order_amount: string | number;
  delivery_fee: string | number;
  avg_prep_minutes: number;
  rating_avg: string | number;
  rating_count: number;
  commission_rate: string | number | null;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRow {
  id: string;
  store_id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  base_price: string | number;
  image_url: string | null;
  is_available: boolean;
  stock_quantity: number | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CategoryRow {
  id: string;
  store_id: string | null;
  parent_id: string | null;
  name_ar: string;
  name_en: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StoreOrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  currency: string;
  subtotal: string | number;
  delivery_fee: string | number;
  discount_total: string | number;
  total: string | number;
  customer_notes: string | null;
  delivery_address_text: string;
  recipient_name: string;
  recipient_phone: string;
  reject_reason: string | null;
  placed_at: Date | null;
  accepted_at: Date | null;
  ready_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
  notes: string | null;
}

@Injectable()
export class StoreOwnerRepository {
  constructor(private readonly db: DatabaseService) {}

  // ───── المتجر ─────

  async findMyStore(userId: string): Promise<MyStoreRow | null> {
    const result = await this.db.query<MyStoreRow>(
      `
      SELECT
        id, owner_user_id, name_ar, name_en, slug,
        description_ar, description_en, logo_url, cover_url,
        phone, email, address_text, latitude, longitude,
        status, is_open, accepts_orders, min_order_amount, delivery_fee,
        avg_prep_minutes, rating_avg, rating_count, commission_rate,
        is_featured, created_at, updated_at
      FROM stores
      WHERE owner_user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateMyStore(
    storeId: string,
    fields: {
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string;
      descriptionEn?: string;
      phone?: string;
      addressText?: string;
      isOpen?: boolean;
      acceptsOrders?: boolean;
      minOrderAmount?: number;
      deliveryFee?: number;
      avgPrepMinutes?: number;
    },
  ): Promise<MyStoreRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const map: Array<[string, unknown]> = [
      ['name_ar', fields.nameAr],
      ['name_en', fields.nameEn],
      ['description_ar', fields.descriptionAr],
      ['description_en', fields.descriptionEn],
      ['phone', fields.phone],
      ['address_text', fields.addressText],
      ['is_open', fields.isOpen],
      ['accepts_orders', fields.acceptsOrders],
      ['min_order_amount', fields.minOrderAmount],
      ['delivery_fee', fields.deliveryFee],
      ['avg_prep_minutes', fields.avgPrepMinutes],
    ];

    for (const [col, val] of map) {
      if (val !== undefined) {
        sets.push(`${col} = $${i++}`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findMyStoreById(storeId);

    params.push(storeId);
    const result = await this.db.query<MyStoreRow>(
      `
      UPDATE stores SET ${sets.join(', ')}
      WHERE id = $${i} AND deleted_at IS NULL
      RETURNING
        id, owner_user_id, name_ar, name_en, slug,
        description_ar, description_en, logo_url, cover_url,
        phone, email, address_text, latitude, longitude,
        status, is_open, accepts_orders, min_order_amount, delivery_fee,
        avg_prep_minutes, rating_avg, rating_count, commission_rate,
        is_featured, created_at, updated_at
      `,
      params,
    );
    return result.rows[0] ?? null;
  }

  async findMyStoreById(storeId: string): Promise<MyStoreRow | null> {
    const result = await this.db.query<MyStoreRow>(
      `
      SELECT
        id, owner_user_id, name_ar, name_en, slug,
        description_ar, description_en, logo_url, cover_url,
        phone, email, address_text, latitude, longitude,
        status, is_open, accepts_orders, min_order_amount, delivery_fee,
        avg_prep_minutes, rating_avg, rating_count, commission_rate,
        is_featured, created_at, updated_at
      FROM stores WHERE id = $1 AND deleted_at IS NULL LIMIT 1
      `,
      [storeId],
    );
    return result.rows[0] ?? null;
  }

  // ───── التصنيفات ─────

  async listMyCategories(storeId: string): Promise<CategoryRow[]> {
    const result = await this.db.query<CategoryRow>(
      `
      SELECT id, store_id, parent_id, name_ar, name_en, image_url, sort_order, is_active
      FROM categories
      WHERE store_id = $1 AND is_active = true
      ORDER BY sort_order ASC, name_ar ASC
      `,
      [storeId],
    );
    return result.rows;
  }

  async createCategory(
    storeId: string,
    data: { nameAr: string; nameEn: string; sortOrder?: number },
  ): Promise<CategoryRow> {
    const result = await this.db.query<CategoryRow>(
      `
      INSERT INTO categories (store_id, name_ar, name_en, sort_order, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, store_id, parent_id, name_ar, name_en, image_url, sort_order, is_active
      `,
      [storeId, data.nameAr, data.nameEn, data.sortOrder ?? 0],
    );
    return result.rows[0];
  }

  async categoryBelongsToStore(
    categoryId: string,
    storeId: string,
  ): Promise<boolean> {
    const r = await this.db.query<{ id: string }>(
      `SELECT id FROM categories WHERE id = $1 AND store_id = $2 AND is_active = true LIMIT 1`,
      [categoryId, storeId],
    );
    return r.rows.length > 0;
  }

  // ───── المنتجات ─────

  async listProducts(
    storeId: string,
    query: { page: number; limit: number; search?: string; categoryId?: string },
  ): Promise<{ rows: ProductRow[]; total: number }> {
    const where: string[] = ['p.store_id = $1', 'p.deleted_at IS NULL'];
    const params: unknown[] = [storeId];
    let i = 2;

    if (query.search) {
      where.push(`(p.name_ar ILIKE $${i} OR p.name_en ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }
    if (query.categoryId) {
      where.push(`p.category_id = $${i++}`);
      params.push(query.categoryId);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM products p ${whereSql}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const rowsRes = await this.db.query<ProductRow>(
      `
      SELECT
        id, store_id, category_id, name_ar, name_en,
        description_ar, description_en, base_price, image_url,
        is_available, stock_quantity, sort_order,
        created_at, updated_at, deleted_at
      FROM products p
      ${whereSql}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findProduct(
    productId: string,
    storeId: string,
  ): Promise<ProductRow | null> {
    const result = await this.db.query<ProductRow>(
      `
      SELECT
        id, store_id, category_id, name_ar, name_en,
        description_ar, description_en, base_price, image_url,
        is_available, stock_quantity, sort_order,
        created_at, updated_at, deleted_at
      FROM products
      WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
      LIMIT 1
      `,
      [productId, storeId],
    );
    return result.rows[0] ?? null;
  }

  async createProduct(
    storeId: string,
    data: {
      nameAr: string;
      nameEn: string;
      descriptionAr?: string;
      descriptionEn?: string;
      basePrice: number;
      categoryId?: string;
      imageUrl?: string;
      isAvailable?: boolean;
      stockQuantity?: number;
      sortOrder?: number;
    },
  ): Promise<ProductRow> {
    const result = await this.db.query<ProductRow>(
      `
      INSERT INTO products (
        store_id, category_id, name_ar, name_en,
        description_ar, description_en, base_price, image_url,
        is_available, stock_quantity, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id, store_id, category_id, name_ar, name_en,
        description_ar, description_en, base_price, image_url,
        is_available, stock_quantity, sort_order,
        created_at, updated_at, deleted_at
      `,
      [
        storeId,
        data.categoryId ?? null,
        data.nameAr,
        data.nameEn,
        data.descriptionAr ?? null,
        data.descriptionEn ?? null,
        data.basePrice,
        data.imageUrl ?? null,
        data.isAvailable ?? true,
        data.stockQuantity ?? null,
        data.sortOrder ?? 0,
      ],
    );
    return result.rows[0];
  }

  async updateProduct(
    productId: string,
    storeId: string,
    fields: {
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string;
      descriptionEn?: string;
      basePrice?: number;
      categoryId?: string;
      imageUrl?: string;
      isAvailable?: boolean;
      stockQuantity?: number | null;
      sortOrder?: number;
    },
  ): Promise<ProductRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const map: Array<[string, unknown]> = [
      ['name_ar', fields.nameAr],
      ['name_en', fields.nameEn],
      ['description_ar', fields.descriptionAr],
      ['description_en', fields.descriptionEn],
      ['base_price', fields.basePrice],
      ['category_id', fields.categoryId],
      ['image_url', fields.imageUrl],
      ['is_available', fields.isAvailable],
      ['stock_quantity', fields.stockQuantity],
      ['sort_order', fields.sortOrder],
    ];

    for (const [col, val] of map) {
      if (val !== undefined) {
        sets.push(`${col} = $${i++}`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findProduct(productId, storeId);

    params.push(productId, storeId);
    const result = await this.db.query<ProductRow>(
      `
      UPDATE products SET ${sets.join(', ')}
      WHERE id = $${i++} AND store_id = $${i} AND deleted_at IS NULL
      RETURNING
        id, store_id, category_id, name_ar, name_en,
        description_ar, description_en, base_price, image_url,
        is_available, stock_quantity, sort_order,
        created_at, updated_at, deleted_at
      `,
      params,
    );
    return result.rows[0] ?? null;
  }

  async softDeleteProduct(
    productId: string,
    storeId: string,
  ): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE products SET deleted_at = now() WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [productId, storeId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ───── الطلبات ─────

  async listOrders(
    storeId: string,
    query: StoreOrderQueryDto,
  ): Promise<{ rows: StoreOrderRow[]; total: number }> {
    const where: string[] = ['o.store_id = $1'];
    const params: unknown[] = [storeId];
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
    const rowsRes = await this.db.query<StoreOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.customer_id,
        u.full_name AS customer_name, u.phone AS customer_phone,
        o.status, o.payment_method, o.payment_status, o.currency,
        o.subtotal, o.delivery_fee, o.discount_total, o.total,
        o.customer_notes, o.delivery_address_text,
        o.recipient_name, o.recipient_phone,
        o.reject_reason,
        o.placed_at, o.accepted_at, o.ready_at, o.delivered_at, o.cancelled_at,
        o.created_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, query.limit, offset],
    );

    return { rows: rowsRes.rows, total };
  }

  async findOrderForStore(
    orderId: string,
    storeId: string,
  ): Promise<StoreOrderRow | null> {
    const result = await this.db.query<StoreOrderRow>(
      `
      SELECT
        o.id, o.order_number, o.customer_id,
        u.full_name AS customer_name, u.phone AS customer_phone,
        o.status, o.payment_method, o.payment_status, o.currency,
        o.subtotal, o.delivery_fee, o.discount_total, o.total,
        o.customer_notes, o.delivery_address_text,
        o.recipient_name, o.recipient_phone,
        o.reject_reason,
        o.placed_at, o.accepted_at, o.ready_at, o.delivered_at, o.cancelled_at,
        o.created_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE o.id = $1 AND o.store_id = $2
      LIMIT 1
      `,
      [orderId, storeId],
    );
    return result.rows[0] ?? null;
  }

  async listOrderItems(orderId: string): Promise<OrderItemRow[]> {
    const result = await this.db.query<OrderItemRow>(
      `
      SELECT id, order_id, product_id, product_name, variant_name,
             unit_price, quantity, line_total, notes
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
      `,
      [orderId],
    );
    return result.rows;
  }

  /**
   * تغيير حالة الطلب + تسجيل في order_status_history.
   * القيود: من حالة مسموحة → إلى حالة جديدة.
   */
  async transitionOrderStatus(
    orderId: string,
    storeId: string,
    expectedFrom: string[],
    toStatus: string,
    actorUserId: string,
    actorRole: string,
    note?: string,
    cancellation?: {
      actor: 'customer' | 'store' | 'driver' | 'admin' | 'system';
      reasonCode: string;
    },
  ): Promise<StoreOrderRow | null> {
    return this.db.transaction(async (client: PoolClient) => {
      const cur = await client.query<{ status: string }>(
        `SELECT status FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE`,
        [orderId, storeId],
      );
      const current = cur.rows[0];
      if (!current) return null;

      if (!expectedFrom.includes(current.status)) {
        throw new Error(
          `Cannot transition from "${current.status}" to "${toStatus}"`,
        );
      }

      const updates: string[] = ['status = $1'];
      const params: unknown[] = [toStatus];
      let i = 2;

      if (toStatus === 'accepted') {
        updates.push(`accepted_at = now()`);
      } else if (toStatus === 'ready') {
        updates.push(`ready_at = now()`);
      } else if (toStatus === 'rejected') {
        updates.push(`cancelled_at = now()`);
        updates.push(`cancelled_by = $${i++}`);
        params.push(actorUserId);
        updates.push(`reject_reason = $${i++}`);
        params.push(note ?? 'مرفوض من المتجر');
      }

      // ✨ الإلغاء الجديد — دمج الـ metadata في نفس التحديث
      if (toStatus.startsWith('cancelled_by_') || toStatus === 'cancelled') {
        updates.push(`cancelled_at = COALESCE(cancelled_at, now())`);
        updates.push(`cancelled_by = COALESCE(cancelled_by, $${i++}::uuid)`);
        params.push(actorUserId);

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

      params.push(orderId, storeId);
      const upd = await client.query<StoreOrderRow>(
        `
        UPDATE orders SET ${updates.join(', ')}
        WHERE id = $${i++} AND store_id = $${i}
        RETURNING
          id, order_number, customer_id, NULL::text AS customer_name,
          NULL::text AS customer_phone,
          status, payment_method, payment_status, currency,
          subtotal, delivery_fee, discount_total, total,
          customer_notes, delivery_address_text,
          recipient_name, recipient_phone,
          reject_reason,
          placed_at, accepted_at, ready_at, delivered_at, cancelled_at,
          created_at
        `,
        params,
      );

      await client.query(
        `
        INSERT INTO order_status_history
          (order_id, from_status, to_status, changed_by, actor_role, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [orderId, current.status, toStatus, actorUserId, actorRole, note ?? null],
      );

      return upd.rows[0] ?? null;
    });
  }

  // ───── الإحصائيات ─────

  async getStats(storeId: string): Promise<{
    total_orders: number;
    pending_orders: number;
    accepted_orders: number;
    preparing_orders: number;
    ready_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_products: number;
    available_products: number;
    total_revenue: number;
  }> {
    const r = await this.db.query<{
      total_orders: string;
      pending_orders: string;
      accepted_orders: string;
      preparing_orders: string;
      ready_orders: string;
      delivered_orders: string;
      cancelled_orders: string;
      total_products: string;
      available_products: string;
      total_revenue: string;
    }>(
      `
      SELECT
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1) AS total_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'pending') AS pending_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'accepted') AS accepted_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'preparing') AS preparing_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'ready') AS ready_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'delivered') AS delivered_orders,
        (SELECT COUNT(*)::text FROM orders WHERE store_id = $1 AND status = 'cancelled') AS cancelled_orders,
        (SELECT COUNT(*)::text FROM products WHERE store_id = $1 AND deleted_at IS NULL) AS total_products,
        (SELECT COUNT(*)::text FROM products WHERE store_id = $1 AND deleted_at IS NULL AND is_available = true) AS available_products,
        (SELECT COALESCE(SUM(total), 0)::text FROM orders WHERE store_id = $1 AND status = 'delivered') AS total_revenue
      `,
      [storeId],
    );
    const row = r.rows[0];
    return {
      total_orders: parseInt(row.total_orders, 10),
      pending_orders: parseInt(row.pending_orders, 10),
      accepted_orders: parseInt(row.accepted_orders, 10),
      preparing_orders: parseInt(row.preparing_orders, 10),
      ready_orders: parseInt(row.ready_orders, 10),
      delivered_orders: parseInt(row.delivered_orders, 10),
      cancelled_orders: parseInt(row.cancelled_orders, 10),
      total_products: parseInt(row.total_products, 10),
      available_products: parseInt(row.available_products, 10),
      total_revenue: parseFloat(row.total_revenue),
    };
  }

  /**
   * حفظ cancellation metadata (actor + reason + note)
   */
  async saveCancellationMetadata(
    orderId: string,
    actor: 'customer' | 'store' | 'driver' | 'admin' | 'system',
    reasonCode: string,
    note: string | null,
  ): Promise<void> {
    await this.db.query(
      `
      UPDATE orders
      SET cancellation_actor = $1::cancellation_actor,
          cancellation_reason_code = $2::cancellation_reason,
          cancellation_note = $3
      WHERE id = $4
      `,
      [actor, reasonCode, note, orderId],
    );
  }
}
