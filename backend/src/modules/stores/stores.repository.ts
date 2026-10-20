import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
import { StoreQueryDto } from './dto/store-query.dto';

export interface StoreRow {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  address_text: string;
  latitude: string | number;
  longitude: string | number;
  is_open: boolean;
  accepts_orders: boolean;
  delivery_fee: string | number;
  min_order_amount: string | number;
  avg_prep_minutes: number;
  rating_avg: string | number;
  rating_count: number;
}

@Injectable()
export class StoresRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(query: StoreQueryDto): Promise<{ rows: StoreRow[]; total: number }> {
    const where: string[] = ['s.deleted_at IS NULL', "s.status = 'active'"];
    const params: unknown[] = [];
    let i = 1;

    if (query.search) {
      where.push(`(s.name_ar ILIKE $${i} OR s.name_en ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }
    if (query.categoryId) {
      where.push(`s.platform_category_id = $${i++}`);
      params.push(query.categoryId);
    }
    if (query.openOnly) {
      where.push(`s.is_open = true AND s.accepts_orders = true`);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM stores s ${whereSql}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const limit = query.limit;
    const sortBy = ['created_at', 'rating_avg', 'name_ar'].includes(query.sortBy ?? '')
      ? query.sortBy
      : 'created_at';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rowsResult = await this.db.query<StoreRow>(
      `
      SELECT
        s.id, s.name_ar, s.name_en, s.slug, s.description_ar,
        s.logo_url, s.cover_url, s.phone, s.address_text,
        s.latitude, s.longitude, s.is_open, s.accepts_orders,
        s.delivery_fee, s.min_order_amount, s.avg_prep_minutes,
        s.rating_avg, s.rating_count
      FROM stores s
      ${whereSql}
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, limit, offset],
    );

    return { rows: rowsResult.rows, total };
  }

  async findById(id: string): Promise<StoreRow | null> {
    const result = await this.db.query<StoreRow>(
      `
      SELECT
        s.id, s.name_ar, s.name_en, s.slug, s.description_ar,
        s.logo_url, s.cover_url, s.phone, s.address_text,
        s.latitude, s.longitude, s.is_open, s.accepts_orders,
        s.delivery_fee, s.min_order_amount, s.avg_prep_minutes,
        s.rating_avg, s.rating_count
      FROM stores s
      WHERE s.id = $1 AND s.deleted_at IS NULL AND s.status = 'active'
      LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
