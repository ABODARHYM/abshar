import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface ZoneRow {
  id: string;
  city: string;
  name_ar: string;
  name_en: string;
  base_delivery_fee: string | number;
  fee_per_km: string | number;
  min_order_amount: string | number;
  free_delivery_threshold: string | number | null;
  surge_multiplier: string | number;
  fuel_surcharge: string | number;
  is_active: boolean;
}

@Injectable()
export class PricingRepository {
  constructor(private readonly db: DatabaseService) {}

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
        SELECT id, city, name_ar, name_en,
               base_delivery_fee, fee_per_km, min_order_amount,
               free_delivery_threshold, surge_multiplier, fuel_surcharge,
               is_active
        FROM delivery_zones
        WHERE is_active = true AND city = $1
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
      SELECT id, city, name_ar, name_en,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones
      WHERE is_active = true
      ORDER BY city ASC, base_delivery_fee ASC
      LIMIT 1
      `,
    );
    return r.rows[0] ?? null;
  }

  async getZoneById(id: string): Promise<ZoneRow | null> {
    const r = await this.db.query<ZoneRow>(
      `
      SELECT id, city, name_ar, name_en,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listActiveZones(): Promise<ZoneRow[]> {
    const r = await this.db.query<ZoneRow>(
      `
      SELECT id, city, name_ar, name_en,
             base_delivery_fee, fee_per_km, min_order_amount,
             free_delivery_threshold, surge_multiplier, fuel_surcharge,
             is_active
      FROM delivery_zones
      WHERE is_active = true
      ORDER BY city ASC, name_ar ASC
      `,
    );
    return r.rows;
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
      RETURNING id, city, name_ar, name_en,
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
