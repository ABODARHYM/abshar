import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface CityRow {
  id: string;
  country_code: string;
  name_ar: string;
  name_en: string;
  slug: string;
  latitude: string | number;
  longitude: string | number;
  timezone: string;
  is_active: boolean;
  sort_order: number;
}

export interface DistrictRow {
  id: string;
  city_id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_active: boolean;
  sort_order: number;
}

export interface AreaRow {
  id: string;
  district_id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_active: boolean;
  sort_order: number;
}

@Injectable()
export class GeographyRepository {
  constructor(private readonly db: DatabaseService) {}

  async listCities(): Promise<CityRow[]> {
    const r = await this.db.query<CityRow>(
      `
      SELECT id, country_code, name_ar, name_en, slug,
             latitude, longitude, timezone, is_active, sort_order
      FROM cities
      WHERE is_active = true
      ORDER BY sort_order ASC, name_ar ASC
      `,
    );
    return r.rows;
  }

  async findCity(id: string): Promise<CityRow | null> {
    const r = await this.db.query<CityRow>(
      `
      SELECT id, country_code, name_ar, name_en, slug,
             latitude, longitude, timezone, is_active, sort_order
      FROM cities WHERE id = $1 LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listDistricts(cityId: string): Promise<DistrictRow[]> {
    const r = await this.db.query<DistrictRow>(
      `
      SELECT id, city_id, name_ar, name_en, slug,
             latitude, longitude, is_active, sort_order
      FROM districts
      WHERE city_id = $1 AND is_active = true
      ORDER BY sort_order ASC, name_ar ASC
      `,
      [cityId],
    );
    return r.rows;
  }

  async findDistrict(id: string): Promise<DistrictRow | null> {
    const r = await this.db.query<DistrictRow>(
      `
      SELECT id, city_id, name_ar, name_en, slug,
             latitude, longitude, is_active, sort_order
      FROM districts WHERE id = $1 LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listAreas(districtId: string): Promise<AreaRow[]> {
    const r = await this.db.query<AreaRow>(
      `
      SELECT id, district_id, name_ar, name_en, slug,
             latitude, longitude, is_active, sort_order
      FROM areas
      WHERE district_id = $1 AND is_active = true
      ORDER BY sort_order ASC, name_ar ASC
      `,
      [districtId],
    );
    return r.rows;
  }

  async findArea(id: string): Promise<AreaRow | null> {
    const r = await this.db.query<AreaRow>(
      `
      SELECT id, district_id, name_ar, name_en, slug,
             latitude, longitude, is_active, sort_order
      FROM areas WHERE id = $1 LIMIT 1
      `,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async search(query: string, limit: number = 20): Promise<{
    cities: CityRow[];
    districts: DistrictRow[];
    areas: AreaRow[];
  }> {
    const q = `%${query}%`;
    const [cities, districts, areas] = await Promise.all([
      this.db.query<CityRow>(
        `SELECT id, country_code, name_ar, name_en, slug, latitude, longitude, timezone, is_active, sort_order
         FROM cities WHERE is_active = true AND (name_ar ILIKE $1 OR name_en ILIKE $1) LIMIT $2`,
        [q, limit],
      ),
      this.db.query<DistrictRow>(
        `SELECT id, city_id, name_ar, name_en, slug, latitude, longitude, is_active, sort_order
         FROM districts WHERE is_active = true AND (name_ar ILIKE $1 OR name_en ILIKE $1) LIMIT $2`,
        [q, limit],
      ),
      this.db.query<AreaRow>(
        `SELECT id, district_id, name_ar, name_en, slug, latitude, longitude, is_active, sort_order
         FROM areas WHERE is_active = true AND (name_ar ILIKE $1 OR name_en ILIKE $1) LIMIT $2`,
        [q, limit],
      ),
    ]);
    return { cities: cities.rows, districts: districts.rows, areas: areas.rows };
  }
}
