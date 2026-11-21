import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';

export interface DriverNearbyRow {
  user_id: string;
  full_name: string;
  latitude: string | number | null;
  longitude: string | number | null;
  distance_km: string;
  rating_avg: string | number;
  availability: string;
}

@Injectable()
export class DispatchRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * احصل على أقرب المندوبين المتاحين للمتجر
   * - يحسب المسافة بالكيلومتر عبر haversine
   * - يرتب حسب: online > busy، ثم المسافة
   * - يستثني المندوبين الذين لديهم عرض فعّال بالفعل
   */
  async findNearbyAvailableDrivers(params: {
    storeLat: number;
    storeLng: number;
    excludeDriverIds?: string[];
    limit: number;
  }): Promise<DriverNearbyRow[]> {
    // Fail closed: never dispatch when the store coordinates are missing or invalid.
    if (
      !Number.isFinite(params.storeLat) ||
      !Number.isFinite(params.storeLng) ||
      params.storeLat < -90 || params.storeLat > 90 ||
      params.storeLng < -180 || params.storeLng > 180 ||
      !Number.isInteger(params.limit) || params.limit < 1
    ) {
      return [];
    }

    const excluded = params.excludeDriverIds ?? [];
    const excludeClause = excluded.length > 0
      ? `AND d.user_id <> ALL($4::uuid[])`
      : '';

    const queryParams: unknown[] = [
      params.storeLat,
      params.storeLng,
      params.limit,
      ...(excluded.length > 0 ? [excluded] : []),
    ];

    const r = await this.db.query<DriverNearbyRow>(
      `
      WITH eligible_drivers AS (
        SELECT
          d.user_id,
          u.full_name,
          d.last_latitude AS latitude,
          d.last_longitude AS longitude,
          d.availability,
          d.rating_avg,
          (
            6371 * acos(
              LEAST(1, GREATEST(-1,
                cos(radians($1)) * cos(radians(d.last_latitude)) *
                cos(radians(d.last_longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(d.last_latitude))
              ))
            )
          ) AS distance_km
        FROM drivers d
        JOIN users u ON u.id = d.user_id
        WHERE d.status = 'active'
          AND d.availability = 'online'
          AND u.deleted_at IS NULL
          AND d.last_latitude IS NOT NULL
          AND d.last_longitude IS NOT NULL
          AND d.last_location_at IS NOT NULL
          AND d.last_location_at >= now() - interval '15 minutes'
          AND d.last_latitude BETWEEN -90 AND 90
          AND d.last_longitude BETWEEN -180 AND 180
          ${excludeClause}
      )
      SELECT
        user_id,
        full_name,
        latitude,
        longitude,
        distance_km::numeric(8,2)::text AS distance_km,
        rating_avg,
        availability
      FROM eligible_drivers
      WHERE distance_km <= 30
      ORDER BY distance_km ASC, rating_avg DESC
      LIMIT $3
      `,
      queryParams,
    );

    return r.rows;
  }

  /**
   * أنشئ عرضًا لمندوب
   */
  async createOffer(params: {
    orderId: string;
    driverId: string;
    expiresAt: Date;
    roundNumber: number;
    tier: number;
    distanceKm: number | null;
    mode?: 'manual' | 'auto';
  }): Promise<{ id: string } | null> {
    return this.db.transaction(async (client: PoolClient) => {
      // Serialize offer creation with driver acceptance on the same order row.
      const order = await client.query<{ status: string; driver_id: string | null }>(
        `SELECT status, driver_id FROM orders WHERE id = $1 FOR UPDATE`,
        [params.orderId],
      );
      const current = order.rows[0];
      if (!current || current.status !== 'ready' || current.driver_id !== null) {
        return null;
      }

      const r = await client.query<{ id: string }>(
        `
        INSERT INTO driver_assignments (
          order_id, driver_id, status, mode,
          offered_at, expires_at, round_number, tier, distance_km
        )
        VALUES ($1, $2, 'offered', $3, now(), $4, $5, $6, $7)
        RETURNING id
        `,
        [
          params.orderId,
          params.driverId,
          params.mode ?? 'auto',
          params.expiresAt,
          params.roundNumber,
          params.tier,
          params.distanceKm,
        ],
      );
      return r.rows[0] ?? null;
    });
  }

  /**
   * احصل على المندوبين الذين لهم عرض فعّال على هذا الطلب
   */
  async getActiveOffers(orderId: string): Promise<Array<{ driver_id: string }>> {
    const r = await this.db.query<{ driver_id: string }>(
      `
      SELECT driver_id
      FROM driver_assignments
      WHERE order_id = $1
        AND status = 'offered'
        AND expires_at > now()
      `,
      [orderId],
    );
    return r.rows;
  }

  /**
   * احصل على جولة الطلب الحالية
   */
  async getCurrentRound(orderId: string): Promise<number> {
    const r = await this.db.query<{ max_round: string }>(
      `SELECT COALESCE(MAX(round_number), 0)::text AS max_round FROM driver_assignments WHERE order_id = $1`,
      [orderId],
    );
    return parseInt(r.rows[0]?.max_round ?? '0', 10);
  }

  /**
   * احصل على كل المندوبين الذين عُرض عليهم الطلب
   */
  async getOfferedDriverIds(orderId: string): Promise<string[]> {
    const r = await this.db.query<{ driver_id: string }>(
      `SELECT DISTINCT driver_id FROM driver_assignments WHERE order_id = $1`,
      [orderId],
    );
    return r.rows.map((row) => row.driver_id);
  }

  /**
   * Expire timed-out offers and return still-ready orders that need the next dispatch round.
   * The update and candidate selection are atomic so only one worker claims newly expired rows.
   */
  async expireOffersAndFindReadyOrders(): Promise<{
    expiredCount: number;
    orders: Array<{ orderId: string; orderNumber: string; storeId: string; deliveryArea: string }>;
  }> {
    return this.db.transaction(async (client: PoolClient) => {
      const expired = await client.query<{ order_id: string }>(
        `UPDATE driver_assignments
         SET status = 'expired', responded_at = now()
         WHERE status = 'offered' AND expires_at IS NOT NULL AND expires_at <= now()
         RETURNING order_id`,
      );
      const orderIds = [...new Set(expired.rows.map((row) => row.order_id))];
      if (orderIds.length === 0) return { expiredCount: 0, orders: [] };

      const candidates = await client.query<{
        order_id: string; order_number: string; store_id: string; delivery_area: string | null;
      }>(
        `SELECT o.id AS order_id, o.order_number, o.store_id,
                o.delivery_address_text AS delivery_area
         FROM orders o
         WHERE o.id = ANY($1::uuid[])
           AND o.status = 'ready'
           AND o.driver_id IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM driver_assignments active
             WHERE active.order_id = o.id AND active.status = 'offered'
               AND (active.expires_at IS NULL OR active.expires_at > now())
           )
           AND NOT EXISTS (
             SELECT 1 FROM driver_assignments accepted
             WHERE accepted.order_id = o.id AND accepted.status = 'accepted'
           )
           AND COALESCE((
             SELECT MAX(history.round_number) FROM driver_assignments history
             WHERE history.order_id = o.id
           ), 0) BETWEEN 1 AND 3
         ORDER BY o.ready_at ASC NULLS LAST, o.created_at ASC
         FOR UPDATE OF o SKIP LOCKED`,
        [orderIds],
      );

      return {
        expiredCount: expired.rowCount ?? 0,
        orders: candidates.rows.map((row) => ({
          orderId: row.order_id,
          orderNumber: row.order_number,
          storeId: row.store_id,
          deliveryArea: row.delivery_area ?? '',
        })),
      };
    });
  }
  /**
   * احذف العروض المنتهية
   */
  async expireOldOffers(): Promise<number> {
    const r = await this.db.query(
      `
      UPDATE driver_assignments
      SET status = 'expired', responded_at = now()
      WHERE status = 'offered'
        AND expires_at < now()
      `,
    );
    return r.rowCount ?? 0;
  }

  /**
   * احصل على معلومات المتجر
   */
  async getStoreInfo(storeId: string): Promise<{
    id: string;
    name_ar: string;
    latitude: string | number | null;
    longitude: string | number | null;
    zone_id: string | null;
  } | null> {
    const r = await this.db.query<{
      id: string;
      name_ar: string;
      latitude: string | number | null;
      longitude: string | number | null;
      zone_id: string | null;
    }>(
      `SELECT id, name_ar, latitude, longitude, zone_id FROM stores WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [storeId],
    );
    return r.rows[0] ?? null;
  }

  /**
   * احذف عروض مندوب معين على طلب
   */
  async removeOffer(orderId: string, driverId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM driver_assignments WHERE order_id = $1 AND driver_id = $2 AND status = 'offered'`,
      [orderId, driverId],
    );
  }

  /**
   * احذف كل عروض الطلب
   */
  async removeAllOffersForOrder(orderId: string): Promise<number> {
    const r = await this.db.query(
      `DELETE FROM driver_assignments WHERE order_id = $1 AND status = 'offered'`,
      [orderId],
    );
    return r.rowCount ?? 0;
  }

  /**
   * معلومات المستخدم للتحقق من expiry
   */
  async getExpiredOffers(limit = 100): Promise<Array<{ id: string; order_id: string; driver_id: string }>> {
    const r = await this.db.query<{ id: string; order_id: string; driver_id: string }>(
      `
      SELECT id, order_id, driver_id
      FROM driver_assignments
      WHERE status = 'offered'
        AND expires_at < now()
      ORDER BY expires_at ASC
      LIMIT $1
      `,
      [limit],
    );
    return r.rows;
  }
}
