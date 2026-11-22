import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';

export interface AddressRow {
  id: string;
  user_id: string;
  label: string;
  address_line: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  latitude: string | number;
  longitude: string | number;
  zone_id: string | null;
  city_id: string | null;
  district_id: string | null;
  area_id: string | null;
  city_name?: string | null;
  district_name?: string | null;
  area_name?: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AddressInput {
  label?: string;
  addressLine?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  zoneId?: string;
  cityId?: string | null;
  districtId?: string | null;
  areaId?: string | null;
  isDefault?: boolean;
}

@Injectable()
export class AddressesRepository {
  constructor(private readonly db: DatabaseService) {}

  async listByUser(userId: string): Promise<AddressRow[]> {
    const result = await this.db.query<AddressRow>(
      `
      SELECT a.id, a.user_id, a.label, a.address_line, a.building, a.floor, a.apartment,
                  a.landmark, a.latitude, a.longitude, a.zone_id,
                  a.city_id, a.district_id, a.area_id,
                  c.name_ar AS city_name, d.name_ar AS district_name, ar.name_ar AS area_name,
                  a.is_default, a.created_at, a.updated_at
      FROM addresses a
      LEFT JOIN cities c ON c.id = a.city_id
      LEFT JOIN districts d ON d.id = a.district_id
      LEFT JOIN areas ar ON ar.id = a.area_id
      WHERE a.user_id = $1 AND a.deleted_at IS NULL
      ORDER BY a.is_default DESC, a.created_at DESC
      `,
      [userId],
    );
    return result.rows;
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<AddressRow | null> {
    const result = await this.db.query<AddressRow>(
      `
      SELECT a.id, a.user_id, a.label, a.address_line, a.building, a.floor, a.apartment,
                  a.landmark, a.latitude, a.longitude, a.zone_id,
                  a.city_id, a.district_id, a.area_id,
                  c.name_ar AS city_name, d.name_ar AS district_name, ar.name_ar AS area_name,
                  a.is_default, a.created_at, a.updated_at
      FROM addresses a
      LEFT JOIN cities c ON c.id = a.city_id
      LEFT JOIN districts d ON d.id = a.district_id
      LEFT JOIN areas ar ON ar.id = a.area_id
      WHERE a.id = $1 AND a.user_id = $2 AND a.deleted_at IS NULL
      LIMIT 1
      `,
      [id, userId],
    );
    return result.rows[0] ?? null;
  }

  async findActiveZoneGeography(zoneId: string): Promise<{
    city_id: string | null;
    district_id: string | null;
  } | null> {
    const result = await this.db.query<{
      city_id: string | null;
      district_id: string | null;
    }>(
      `SELECT city_id, district_id
       FROM delivery_zones z
       JOIN districts d ON d.id = z.district_id
       WHERE z.id = $1 AND z.is_active = true
         AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
       LIMIT 1`,
      [zoneId],
    );
    return result.rows[0] ?? null;
  }

  async validateAddressGeography(input: {
    cityId?: string | null;
    districtId?: string | null;
    areaId?: string | null;
    zoneId: string;
  }): Promise<boolean> {
    const result = await this.db.query<{ valid: boolean }>(
      `SELECT
        (
          EXISTS (
            SELECT 1 FROM delivery_zones z
            JOIN districts zd ON zd.id = z.district_id
            WHERE z.id = $4 AND z.is_active = true
              AND COALESCE(to_jsonb(zd)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
              AND (z.city_id IS NULL OR z.city_id = $1::uuid)
              AND (z.district_id IS NULL OR z.district_id = $2::uuid)
          )
          AND ($1::uuid IS NULL OR EXISTS (
            SELECT 1 FROM cities c WHERE c.id = $1 AND c.is_active = true
          ))
          AND ($2::uuid IS NULL OR EXISTS (
            SELECT 1 FROM districts d
            WHERE d.id = $2 AND d.is_active = true
              AND ($1::uuid IS NULL OR d.city_id = $1::uuid)
          ))
          AND ($3::uuid IS NULL OR (
            $2::uuid IS NOT NULL AND EXISTS (
              SELECT 1 FROM areas ar
              WHERE ar.id = $3 AND ar.is_active = true
                AND ar.district_id = $2::uuid
            )
          ))
        ) AS valid`,
      [input.cityId ?? null, input.districtId ?? null, input.areaId ?? null, input.zoneId],
    );
    return result.rows[0]?.valid === true;
  }

  async validateAddressGeographyWithoutZone(input: {
    cityId?: string | null;
    districtId?: string | null;
    areaId?: string | null;
  }): Promise<boolean> {
    const result = await this.db.query<{ valid: boolean }>(
      `SELECT
        ($1::uuid IS NULL OR EXISTS (SELECT 1 FROM cities c WHERE c.id = $1 AND c.is_active = true))
        AND ($2::uuid IS NULL OR EXISTS (
          SELECT 1 FROM districts d WHERE d.id = $2 AND d.is_active = true
            AND ($1::uuid IS NULL OR d.city_id = $1::uuid)
            AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
        ))
        AND ($3::uuid IS NULL OR EXISTS (
          SELECT 1 FROM areas ar JOIN districts d ON d.id = ar.district_id
          WHERE ar.id = $3 AND ar.is_active = true AND $2::uuid IS NOT NULL
            AND ar.district_id = $2::uuid
            AND COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
            AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
        )) AS valid`,
      [input.cityId ?? null, input.districtId ?? null, input.areaId ?? null],
    );
    return result.rows[0]?.valid === true;
  }

  /**
   * إنشاء عنوان. إذا isDefault=true => نلغي is_default عن بقية عناوين المستخدم
   * داخل transaction واحدة.
   */
  async create(userId: string, input: AddressInput): Promise<AddressRow> {
    return this.db.transaction(async (client: PoolClient) => {
      if (input.isDefault) {
        await client.query(
          `UPDATE addresses SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL AND is_default = true`,
          [userId],
        );
      }

      const result = await client.query<AddressRow>(
        `
        INSERT INTO addresses (
          user_id, label, address_line, building, floor, apartment,
          landmark, latitude, longitude, zone_id, city_id, district_id, area_id, is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, user_id, label, address_line, building, floor, apartment,
                  landmark, latitude, longitude, zone_id, city_id, district_id, area_id, is_default,
                  created_at, updated_at
        `,
        [
          userId,
          input.label ?? 'home',
          input.addressLine,
          input.building ?? null,
          input.floor ?? null,
          input.apartment ?? null,
          input.landmark ?? null,
          input.latitude,
          input.longitude,
          input.zoneId ?? null,
          input.cityId ?? null,
          input.districtId ?? null,
          input.areaId ?? null,
          input.isDefault ?? false,
        ],
      );
      return result.rows[0];
    });
  }

  async update(
    id: string,
    userId: string,
    input: AddressInput,
  ): Promise<AddressRow | null> {
    return this.db.transaction(async (client: PoolClient) => {
      if (input.isDefault === true) {
        await client.query(
          `UPDATE addresses SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL AND id <> $2 AND is_default = true`,
          [userId, id],
        );
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 1;

      const map: Array<[string, unknown]> = [
        ['label', input.label],
        ['address_line', input.addressLine],
        ['building', input.building],
        ['floor', input.floor],
        ['apartment', input.apartment],
        ['landmark', input.landmark],
        ['latitude', input.latitude],
        ['longitude', input.longitude],
        ['zone_id', input.zoneId],
        ['city_id', input.cityId],
        ['district_id', input.districtId],
        ['area_id', input.areaId],
        ['is_default', input.isDefault],
      ];
      for (const [col, val] of map) {
        if (val !== undefined) {
          sets.push(`${col} = $${i++}`);
          params.push(val);
        }
      }

      if (sets.length === 0) {
        const cur = await client.query<AddressRow>(
          `
          SELECT id, user_id, label, address_line, building, floor, apartment,
                 landmark, latitude, longitude, zone_id, city_id, district_id, area_id, is_default,
                 created_at, updated_at
          FROM addresses a WHERE a.id = $1 AND a.user_id = $2 AND a.deleted_at IS NULL
          `,
          [id, userId],
        );
        return cur.rows[0] ?? null;
      }

      params.push(id, userId);
      const result = await client.query<AddressRow>(
        `
        UPDATE addresses
        SET ${sets.join(', ')}
        WHERE id = $${i++} AND user_id = $${i} AND deleted_at IS NULL
        RETURNING id, user_id, label, address_line, building, floor, apartment,
                  landmark, latitude, longitude, zone_id, city_id, district_id, area_id, is_default,
                  created_at, updated_at
        `,
        params,
      );
      return result.rows[0] ?? null;
    });
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE addresses SET deleted_at = now(), is_default = false WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async setDefault(id: string, userId: string): Promise<AddressRow | null> {
    return this.db.transaction(async (client: PoolClient) => {
      await client.query(
        `UPDATE addresses SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL AND is_default = true`,
        [userId],
      );
      const result = await client.query<AddressRow>(
        `
        UPDATE addresses SET is_default = true
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        RETURNING id, user_id, label, address_line, building, floor, apartment,
                  landmark, latitude, longitude, zone_id, city_id, district_id, area_id, is_default,
                  created_at, updated_at
        `,
        [id, userId],
      );
      return result.rows[0] ?? null;
    });
  }
}
