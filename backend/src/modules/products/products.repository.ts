import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
import { ProductQueryDto } from './dto/product-query.dto';

export interface ProductRow {
  id: string;
  store_id: string;
  store_name: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  base_price: string | number;
  image_url: string | null;
  is_available: boolean;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(query: ProductQueryDto): Promise<{ rows: ProductRow[]; total: number }> {
    const where: string[] = ['p.deleted_at IS NULL', 's.deleted_at IS NULL', "s.status = 'active'"];
    const params: unknown[] = [];
    let i = 1;

    if (query.search) {
      where.push(`(p.name_ar ILIKE $${i} OR p.name_en ILIKE $${i})`);
      params.push(`%${query.search}%`);
      i++;
    }
    if (query.storeId) {
      where.push(`p.store_id = $${i++}`);
      params.push(query.storeId);
    }
    if (query.categoryId) {
      where.push(`p.category_id = $${i++}`);
      params.push(query.categoryId);
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM products p JOIN stores s ON s.id = p.store_id ${whereSql}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const offset = toOffset(query);
    const limit = query.limit;
    const sortBy = ['created_at', 'base_price', 'name_ar'].includes(query.sortBy ?? '')
      ? query.sortBy
      : 'created_at';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rowsResult = await this.db.query<ProductRow>(
      `
      SELECT
        p.id, p.store_id, s.name_ar AS store_name, p.category_id,
        p.name_ar, p.name_en, p.description_ar,
        p.base_price, p.image_url, p.is_available
      FROM products p
      JOIN stores s ON s.id = p.store_id
      ${whereSql}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, limit, offset],
    );

    return { rows: rowsResult.rows, total };
  }

  async findById(id: string): Promise<ProductRow | null> {
    const result = await this.db.query<ProductRow>(
      `
      SELECT
        p.id, p.store_id, s.name_ar AS store_name, p.category_id,
        p.name_ar, p.name_en, p.description_ar,
        p.base_price, p.image_url, p.is_available
      FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = $1 AND p.deleted_at IS NULL AND s.deleted_at IS NULL
      LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
