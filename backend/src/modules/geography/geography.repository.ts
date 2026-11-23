import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface GovernorateRow {
  id: string; country_code: string; name_ar: string; name_en: string; slug: string;
}
export interface AdministrativeDistrictRow {
  id: string; governorate_id: string; name_ar: string; name_en: string; slug: string;
}
export interface CityRow {
  id: string; country_code: string; name_ar: string; name_en: string; slug: string;
  latitude: string | number; longitude: string | number; timezone: string;
  is_active: boolean; sort_order: number;
}
export interface DistrictRow {
  id: string; city_id: string; name_ar: string; name_en: string; slug: string;
  latitude: string | number | null; longitude: string | number | null;
  is_active: boolean; sort_order: number;
}
export interface AreaRow {
  id: string; district_id: string; name_ar: string; name_en: string; slug: string;
  latitude: string | number | null; longitude: string | number | null;
  is_active: boolean; sort_order: number;
}

@Injectable()
export class GeographyRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Public administrative geography is exposed only when an active record has
   * complete source provenance. Empty/unverified staging tables stay empty;
   * no names are inferred or seeded by the API.
   */
  async listGovernorates(): Promise<GovernorateRow[]> {
    const r = await this.db.query<GovernorateRow>(
      `SELECT id, country_code, name_ar, name_en, slug
       FROM governorates
       WHERE is_active = true
         AND NULLIF(BTRIM(source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(source_url), '') IS NOT NULL
         AND source_updated_at IS NOT NULL
       ORDER BY sort_order ASC, name_ar ASC`,
    );
    return r.rows;
  }

  async listAdministrativeDistricts(governorateId: string): Promise<AdministrativeDistrictRow[]> {
    const r = await this.db.query<AdministrativeDistrictRow>(
      `SELECT ad.id, ad.governorate_id, ad.name_ar, ad.name_en, ad.slug
       FROM administrative_districts ad
       JOIN governorates g ON g.id = ad.governorate_id
       WHERE ad.governorate_id = $1 AND ad.is_active = true
         AND NULLIF(BTRIM(ad.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(ad.source_url), '') IS NOT NULL
         AND ad.source_updated_at IS NOT NULL
         AND g.is_active = true
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       ORDER BY ad.sort_order ASC, ad.name_ar ASC`,
      [governorateId],
    );
    return r.rows;
  }

  /**
   * A selectable city must be explicitly attached to an active, sourced
   * governorate. Legacy operational cities without that link remain in the
   * database for historical/address and delivery-zone references.
   */
  async listCities(): Promise<CityRow[]> {
    const r = await this.db.query<CityRow>(
      `SELECT c.id, c.country_code, c.name_ar, c.name_en, c.slug,
              c.latitude, c.longitude, c.timezone, c.is_active, c.sort_order
       FROM cities c
       JOIN governorates g ON g.id = c.governorate_id
       WHERE c.is_active = true AND g.is_active = true
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       ORDER BY c.sort_order ASC, c.name_ar ASC`,
    );
    return r.rows;
  }

  async listCitiesByGovernorate(governorateId: string): Promise<CityRow[]> {
    const r = await this.db.query<CityRow>(
      `SELECT c.id, c.country_code, c.name_ar, c.name_en, c.slug,
              c.latitude, c.longitude, c.timezone, c.is_active, c.sort_order
       FROM cities c
       JOIN governorates g ON g.id = c.governorate_id
       WHERE c.governorate_id = $1 AND c.is_active = true AND g.is_active = true
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       ORDER BY c.sort_order ASC, c.name_ar ASC`,
      [governorateId],
    );
    return r.rows;
  }

  async findCity(id: string): Promise<CityRow | null> {
    const r = await this.db.query<CityRow>(
      `SELECT c.id, c.country_code, c.name_ar, c.name_en, c.slug,
              c.latitude, c.longitude, c.timezone, c.is_active, c.sort_order
       FROM cities c
       JOIN governorates g ON g.id = c.governorate_id
       WHERE c.id = $1 AND c.is_active = true AND g.is_active = true
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listDistricts(cityId: string): Promise<DistrictRow[]> {
    const r = await this.db.query<DistrictRow>(
      `SELECT d.id, d.city_id, d.name_ar, d.name_en, d.slug, d.latitude, d.longitude, d.is_active, d.sort_order
       FROM districts d
       JOIN cities c ON c.id = d.city_id AND c.is_active = true
       JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
       WHERE d.city_id = $1 AND d.is_active = true
         AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       ORDER BY d.sort_order ASC, d.name_ar ASC`,
      [cityId],
    );
    return r.rows;
  }

  async findDistrict(id: string): Promise<DistrictRow | null> {
    const r = await this.db.query<DistrictRow>(
      `SELECT d.id, d.city_id, d.name_ar, d.name_en, d.slug, d.latitude, d.longitude, d.is_active, d.sort_order
       FROM districts d
       JOIN cities c ON c.id = d.city_id AND c.is_active = true
       JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
       WHERE d.id = $1 AND d.is_active = true
         AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listAreas(districtId: string): Promise<AreaRow[]> {
    const r = await this.db.query<AreaRow>(
      `SELECT ar.id, ar.district_id, ar.name_ar, ar.name_en, ar.slug, ar.latitude, ar.longitude, ar.is_active, ar.sort_order
       FROM areas ar
       JOIN districts d ON d.id = ar.district_id AND d.is_active = true
       JOIN cities c ON c.id = d.city_id AND c.is_active = true
       JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
       WHERE ar.district_id = $1 AND ar.is_active = true
         AND COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       ORDER BY ar.sort_order ASC, ar.name_ar ASC`,
      [districtId],
    );
    return r.rows;
  }

  async findArea(id: string): Promise<AreaRow | null> {
    const r = await this.db.query<AreaRow>(
      `SELECT ar.id, ar.district_id, ar.name_ar, ar.name_en, ar.slug, ar.latitude, ar.longitude, ar.is_active, ar.sort_order
       FROM areas ar
       JOIN districts d ON d.id = ar.district_id AND d.is_active = true
       JOIN cities c ON c.id = d.city_id AND c.is_active = true
       JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
       WHERE ar.id = $1 AND ar.is_active = true
         AND COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
         AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
         AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
         AND g.source_updated_at IS NOT NULL
       LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async search(query: string, limit = 20): Promise<{
    cities: CityRow[]; districts: DistrictRow[]; areas: AreaRow[];
  }> {
    const q = `%${query}%`;
    const [cities, districts, areas] = await Promise.all([
      this.db.query<CityRow>(
        `SELECT c.id, c.country_code, c.name_ar, c.name_en, c.slug,
                c.latitude, c.longitude, c.timezone, c.is_active, c.sort_order
         FROM cities c
         JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
         WHERE c.is_active = true
           AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
           AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
           AND g.source_updated_at IS NOT NULL
           AND (c.name_ar ILIKE $1 OR c.name_en ILIKE $1)
         ORDER BY c.sort_order ASC, c.name_ar ASC LIMIT $2`,
        [q, limit],
      ),
      this.db.query<DistrictRow>(
        `SELECT d.id, d.city_id, d.name_ar, d.name_en, d.slug, d.latitude, d.longitude, d.is_active, d.sort_order
         FROM districts d
         JOIN cities c ON c.id = d.city_id AND c.is_active = true
         JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
         WHERE d.is_active = true
           AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
           AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
           AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
           AND g.source_updated_at IS NOT NULL
           AND (d.name_ar ILIKE $1 OR d.name_en ILIKE $1)
         ORDER BY d.sort_order ASC, d.name_ar ASC LIMIT $2`,
        [q, limit],
      ),
      this.db.query<AreaRow>(
        `SELECT ar.id, ar.district_id, ar.name_ar, ar.name_en, ar.slug, ar.latitude, ar.longitude, ar.is_active, ar.sort_order
         FROM areas ar
         JOIN districts d ON d.id = ar.district_id AND d.is_active = true
         JOIN cities c ON c.id = d.city_id AND c.is_active = true
         JOIN governorates g ON g.id = c.governorate_id AND g.is_active = true
         WHERE ar.is_active = true
           AND COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
           AND COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')
           AND NULLIF(BTRIM(g.source_name), '') IS NOT NULL
           AND NULLIF(BTRIM(g.source_url), '') IS NOT NULL
           AND g.source_updated_at IS NOT NULL
           AND (ar.name_ar ILIKE $1 OR ar.name_en ILIKE $1)
         ORDER BY ar.sort_order ASC, ar.name_ar ASC LIMIT $2`,
        [q, limit],
      ),
    ]);
    return { cities: cities.rows, districts: districts.rows, areas: areas.rows };
  }
}
