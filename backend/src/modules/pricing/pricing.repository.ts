import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface DistanceTierRow {
  id: string;
  zone_id: string;
  min_distance_km: string | number;
  max_distance_km: string | number | null;
  delivery_fee: string | number;
  is_active: boolean;
}

export interface ZoneRow {
  id: string;
  city: string;
  name_ar: string;
  name_en: string;
  city_id?: string | null;
  district_id?: string | null;
  base_delivery_fee: string | number;
  fee_per_km: string | number;
  min_order_amount: string | number;
  free_delivery_threshold: string | number | null;
  surge_multiplier: string | number;
  fuel_surcharge: string | number;
  is_active: boolean;
  coverage_geojson?: unknown | null;
  coverage_status?: 'unverified' | 'verified' | 'rejected';
  coverage_verified_at?: Date | null;
  district_source_status?: string | null;
}

@Injectable()
export class PricingRepository {
  constructor(private readonly db: DatabaseService) {}

  async getStoreQuoteDetails(storeId: string): Promise<{
    id: string; latitude: string | number; longitude: string | number;
    delivery_fee: string | number; min_order_amount: string | number; currency: string;
  } | null> {
    const store = await this.db.query<{
      id: string; latitude: string | number; longitude: string | number;
      delivery_fee: string | number; min_order_amount: string | number;
    }>(
      `SELECT id, latitude, longitude, delivery_fee, min_order_amount
       FROM stores WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [storeId],
    );
    if (!store.rows[0]) return null;
    const currency = await this.db.query<{ value: unknown }>(
      `SELECT value FROM settings WHERE key = 'currency' LIMIT 1`,
    );
    return { ...store.rows[0], currency: String(currency.rows[0]?.value ?? 'USD').replace(/"/g, '') };
  }
  /**
   * ابحث عن zone مناسق حسب إحداثيات (اختياري: city).
   * حالياً: نختار zone يطابق city (لو متوفر)، وإلا نختار أول zone نشط.
   */
  async findZoneForLocation(params: {
    city?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ZoneRow | null> {
    if (params.city) {
      const r = await this.db.query<ZoneRow>(
        `
        SELECT id, city, name_ar, name_en, city_id, district_id,
               base_delivery_fee, fee_per_km, min_order_amount,
               free_delivery_threshold, surge_multiplier, fuel_surcharge,
               is_active
        FROM delivery_zones
        WHERE is_active = true AND coverage_status = 'verified' AND coverage_geojson IS NOT NULL AND city = $1
        ORDER BY base_delivery_fee ASC
        LIMIT 1
        `,
        [params.city],
      );
      if (r.rows[0]) return r.rows[0];
    }

    // Fallback: أول zone نشط
    const r = await this.db.query<ZoneRow>(
      `
      SELECT id, city, name_ar, name_en, city_id, district_id,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones
      WHERE is_active = true AND coverage_status = 'verified' AND coverage_geojson IS NOT NULL
      ORDER BY city ASC, base_delivery_fee ASC
      LIMIT 1
      `,
    );
    return r.rows[0] ?? null;
  }


  async findAddressForUser(addressId: string, userId: string): Promise<{
    zone_id: string | null;
    latitude: string | number;
    longitude: string | number;
  } | null> {
    const r = await this.db.query<{
      zone_id: string | null;
      latitude: string | number;
      longitude: string | number;
    }>(
      `SELECT zone_id, latitude, longitude
       FROM addresses
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [addressId, userId],
    );
    return r.rows[0] ?? null;
  }
  async getZoneCoverage(zoneId: string): Promise<unknown | null> {
    const r = await this.db.query<{ coverage_geojson: unknown | null }>(
      `SELECT coverage_geojson FROM delivery_zones
       WHERE id = $1 AND is_active = true AND coverage_status = 'verified'
       LIMIT 1`, [zoneId],
    );
    return r.rows[0]?.coverage_geojson ?? null;
  }

  async isZoneVerifiedForDelivery(zoneId: string): Promise<boolean> {
    const r = await this.db.query<{ eligible: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM delivery_zones z
         WHERE z.id = $1 AND z.is_active = true
           AND z.coverage_status = 'verified' AND z.coverage_geojson IS NOT NULL
           AND z.coverage_verified_at IS NOT NULL AND z.coverage_verified_by IS NOT NULL
           AND length(trim(coalesce(z.coverage_verification_note, ''))) >= 8
       ) AS eligible`, [zoneId],
    );
    return r.rows[0]?.eligible === true;
  }

  async updateZoneCoverage(input: {
    zoneId: string; geojson: Record<string, unknown> | null;
    status: 'unverified' | 'verified' | 'rejected'; actorId: string; note: string;
  }): Promise<boolean> {
    const r = await this.db.query<{ id: string }>(
      `UPDATE delivery_zones SET
         coverage_geojson = $2::jsonb,
         coverage_status = $3,
         coverage_verified_at = CASE WHEN $3 = 'verified' THEN now() ELSE NULL END,
         coverage_verified_by = CASE WHEN $3 = 'verified' THEN $4::uuid ELSE NULL END,
         coverage_verification_note = $5,
         updated_at = now()
       WHERE id = $1 RETURNING id`,
      [input.zoneId, input.geojson ? JSON.stringify(input.geojson) : null, input.status, input.actorId, input.note],
    );
    return r.rowCount > 0;
  }

  async listActiveDistanceTiers(zoneId: string): Promise<DistanceTierRow[]> {
    const r = await this.db.query<DistanceTierRow>(
      `SELECT id, zone_id, min_distance_km, max_distance_km, delivery_fee, is_active
       FROM delivery_zone_distance_tiers
       WHERE zone_id = $1 AND is_active = true
       ORDER BY min_distance_km ASC`,
      [zoneId],
    );
    return r.rows;
  }

  async createDistanceTier(input: {
    zoneId: string; minDistanceKm: number; maxDistanceKm: number | null; deliveryFee: number;
  }): Promise<DistanceTierRow> {
    const r = await this.db.query<DistanceTierRow>(
      `INSERT INTO delivery_zone_distance_tiers
       (zone_id, min_distance_km, max_distance_km, delivery_fee)
       VALUES ($1, $2, $3, $4)
       RETURNING id, zone_id, min_distance_km, max_distance_km, delivery_fee, is_active`,
      [input.zoneId, input.minDistanceKm, input.maxDistanceKm, input.deliveryFee],
    );
    return r.rows[0];
  }

  async updateDistanceTier(id: string, fields: {
    minDistanceKm?: number; maxDistanceKm?: number | null; deliveryFee?: number; isActive?: boolean;
  }): Promise<DistanceTierRow | null> {
    const columns: Array<[string, unknown]> = [
      ['min_distance_km', fields.minDistanceKm],
      ['max_distance_km', fields.maxDistanceKm],
      ['delivery_fee', fields.deliveryFee],
      ['is_active', fields.isActive],
    ];
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [column, value] of columns) {
      if (value !== undefined) { values.push(value); sets.push(`${column} = ${values.length}`); }
    }
    if (!sets.length) {
      const current = await this.db.query<DistanceTierRow>(
        `SELECT id, zone_id, min_distance_km, max_distance_km, delivery_fee, is_active
         FROM delivery_zone_distance_tiers WHERE id = $1 LIMIT 1`, [id]);
      return current.rows[0] ?? null;
    }
    values.push(id);
    const r = await this.db.query<DistanceTierRow>(
      `UPDATE delivery_zone_distance_tiers SET ${sets.join(', ')}, updated_at = now()
       WHERE id = ${values.length}
       RETURNING id, zone_id, min_distance_km, max_distance_km, delivery_fee, is_active`,
      values,
    );
    return r.rows[0] ?? null;
  }

  async listZonesForAdmin(): Promise<ZoneRow[]> {
    const r = await this.db.query<ZoneRow>(
      `SELECT z.id, z.city, z.name_ar, z.name_en, z.city_id, z.district_id,
              z.base_delivery_fee, z.fee_per_km, z.min_order_amount,
              z.free_delivery_threshold, z.surge_multiplier, z.fuel_surcharge,
              z.is_active, z.coverage_status, z.coverage_verified_at,
              d.source_status AS district_source_status
       FROM delivery_zones z
       LEFT JOIN districts d ON d.id = z.district_id
       ORDER BY z.city ASC, z.name_ar ASC`,
    );
    return r.rows;
  }

  async createZone(input: { cityId: string; nameAr: string; nameEn: string }): Promise<ZoneRow | null> {
    const r = await this.db.query<ZoneRow>(
      `INSERT INTO delivery_zones (
         city, name_ar, name_en, city_id, district_id,
         base_delivery_fee, fee_per_km, min_order_amount, free_delivery_threshold,
         surge_multiplier, fuel_surcharge, is_active
       )
       SELECT c.name_ar, $2, $3, c.id, NULL,
              0, 0, 0, NULL, 1, 0, false
       FROM cities c WHERE c.id = $1 AND c.is_active = true
       RETURNING id, city, name_ar, name_en, city_id, district_id,
                 base_delivery_fee, fee_per_km, min_order_amount,
                 free_delivery_threshold, surge_multiplier, fuel_surcharge, is_active`,
      [input.cityId, input.nameAr.trim(), input.nameEn.trim()],
    );
    return r.rows[0] ?? null;
  }

  async getZoneById(id: string): Promise<ZoneRow | null> {
    const r = await this.db.query<ZoneRow>(
      `
      SELECT id, city, name_ar, name_en, city_id, district_id,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones z
      LEFT JOIN districts d ON d.id = z.district_id
      WHERE z.id = $1
      LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listActiveZones(): Promise<ZoneRow[]> {
    const r = await this.db.query<ZoneRow>(
      `
      SELECT id, city, name_ar, name_en, city_id, district_id,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones z
      WHERE z.is_active = true AND z.coverage_status = 'verified'
        AND z.coverage_geojson IS NOT NULL
        AND z.coverage_verified_at IS NOT NULL AND z.coverage_verified_by IS NOT NULL
        AND length(trim(coalesce(z.coverage_verification_note, ''))) >= 8
      ORDER BY city ASC, name_ar ASC
      `,
    );
    return r.rows;
  }

  /**
   * Road distance from the configured routing provider.
   * ROUTING_API_URL must implement POST {origin:{latitude,longitude},destination:{latitude,longitude}}
   * and return {distanceKm:number}. No straight-line fallback is permitted for charging.
   */
  async calculateRouteDistanceKm(
    originLat: number, originLng: number, destinationLat: number, destinationLng: number,
  ): Promise<number> {
    const endpoint = process.env.ROUTING_API_URL?.trim();
    if (!endpoint) {
      throw new ServiceUnavailableException({
        code: 'ROUTING_NOT_CONFIGURED',
        message: 'خدمة حساب مسافة الطريق غير مهيأة؛ لا يمكن تأكيد رسوم التوصيل حالياً.',
      });
    }
    let url: URL;
    try { url = new URL(endpoint); } catch {
      throw new ServiceUnavailableException({ code: 'ROUTING_CONFIG_INVALID', message: 'إعداد خدمة التوجيه غير صالح.' });
    }
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException({ code: 'ROUTING_CONFIG_INSECURE', message: 'يجب استخدام HTTPS لخدمة التوجيه.' });
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.ROUTING_API_KEY ? { authorization: `Bearer ${process.env.ROUTING_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          origin: { latitude: originLat, longitude: originLng },
          destination: { latitude: destinationLat, longitude: destinationLng },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Routing provider returned HTTP ${response.status}`);
      const data = await response.json() as { distanceKm?: unknown };
      const distance = Number(data?.distanceKm);
      if (!Number.isFinite(distance) || distance < 0 || distance > 500) {
        throw new Error('Routing provider returned an invalid distanceKm');
      }
      return distance;
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'ROUTING_UNAVAILABLE',
        message: 'تعذر حساب مسافة الطريق من مزود التوجيه؛ لم يتم استخدام مسافة خط مستقيم أو رسوم بديلة.',
      });
    }
  }

  /**
   * Haversine distance (km).
   */
  async calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): Promise<number> {
    const r = await this.db.query<{ distance_km: string }>(
      `SELECT haversine_km($1, $2, $3, $4)::numeric(10,4)::text AS distance_km`,
      [lat1, lon1, lat2, lon2],
    );
    return parseFloat(r.rows[0]?.distance_km ?? '0');
  }

  /**
   * اقرأ كل pricing settings مرة واحدة.
   */
  async getPricingSettings(): Promise<Record<string, number>> {
    const r = await this.db.query<{ key: string; value: any }>(
      `SELECT key, value FROM settings WHERE key LIKE 'pricing.%'`,
    );

    const out: Record<string, number> = {};
    for (const row of r.rows) {
      const shortKey = row.key.replace('pricing.', '');
      const v = row.value;
      if (typeof v === 'number') out[shortKey] = v;
      else if (typeof v === 'string') out[shortKey] = parseFloat(v);
      else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const num = Object.values(v)[0];
        out[shortKey] = typeof num === 'number' ? num : parseFloat(String(num ?? 0));
      } else {
        out[shortKey] = 0;
      }
    }

    return out;
  }

  async updateZone(
    id: string,
    fields: {
      baseDeliveryFee?: number;
      feePerKm?: number;
      minOrderAmount?: number;
      freeDeliveryThreshold?: number | null;
      surgeMultiplier?: number;
      fuelSurcharge?: number;
      isActive?: boolean;
    },
  ): Promise<ZoneRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const map: Array<[string, unknown]> = [
      ['base_delivery_fee', fields.baseDeliveryFee],
      ['fee_per_km', fields.feePerKm],
      ['min_order_amount', fields.minOrderAmount],
      ['free_delivery_threshold', fields.freeDeliveryThreshold],
      ['surge_multiplier', fields.surgeMultiplier],
      ['fuel_surcharge', fields.fuelSurcharge],
      ['is_active', fields.isActive],
    ];

    for (const [col, val] of map) {
      if (val !== undefined) {
        sets.push(`${col} = $${i++}`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.getZoneById(id);

    params.push(id);
    const r = await this.db.query<ZoneRow>(
      `
      UPDATE delivery_zones
      SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${i}
      RETURNING id, city, name_ar, name_en, city_id, district_id,
                base_delivery_fee, fee_per_km, min_order_amount,
                free_delivery_threshold, surge_multiplier, fuel_surcharge,
                is_active
      `,
      params,
    );
    return r.rows[0] ?? null;
  }

  async updatePricingSettings(
    settings: Record<string, number>,
    updatedBy: string,
  ): Promise<number> {
    let count = 0;
    for (const [key, value] of Object.entries(settings)) {
      const r = await this.db.query(
        `
        INSERT INTO settings (key, value, updated_by, updated_at)
        VALUES ($1, $2::jsonb, $3, now())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        `,
        [`pricing.${key}`, JSON.stringify(value), updatedBy],
      );
      if ((r.rowCount ?? 0) > 0) count++;
    }
    return count;
  }
}
