import { Injectable } from '@nestjs/common';
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
    const excluded = params.excludeDriverIds ?? [];
    const excludeClause = excluded.length > 0
      ? `AND d.user_id NOT IN (${excluded.map((_, i) => `$${i + 4}`).join(',')})`
      : '';

    const queryParams: unknown[] = [
      params.storeLat,
      params.storeLng,
      params.limit,
      ...excluded,
    ];

    const r = await this.db.query<DriverNearbyRow>(
      `
      SELECT
        d.user_id,
        u.full_name,
        d.last_latitude,
        d.last_longitude,
        d.availability,
        d.rating_avg,
        CASE
          WHEN d.last_latitude IS NULL OR d.last_longitude IS NULL THEN 9999
          ELSE (
            6371 * acos(
              LEAST(1, GREATEST(-1,
                cos(radians($1)) * cos(radians(d.last_latitude)) *
                cos(radians(d.last_longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(d.last_latitude))
              ))
            )
          )
        END::numeric(8,2) AS distance_km
      FROM drivers d
      JOIN users u ON u.id = d.user_id
      WHERE d.status = 'active'
        AND d.availability IN ('online', 'busy')
        AND u.deleted_at IS NULL
        ${excludeClause}
      ORDER BY
        (d.availability = 'online') DESC,
        distance_km ASC,
        d.rating_avg DESC
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
  }): Promise<{ id: string }> {
    const r = await this.db.query<{ id: string }>(
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
    return r.rows[0];
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
    latitude: string | number;
    longitude: string | number;
    zone_id: string | null;
  } | null> {
    const r = await this.db.query<{
      id: string;
      name_ar: string;
      latitude: string | number;
      longitude: string | number;
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
