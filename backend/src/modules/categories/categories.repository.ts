import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

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

@Injectable()
export class CategoriesRepository {
  constructor(private readonly db: DatabaseService) {}

  async listPlatform(): Promise<CategoryRow[]> {
    const result = await this.db.query<CategoryRow>(
      `
      SELECT id, store_id, parent_id, name_ar, name_en, image_url, sort_order, is_active
      FROM categories
      WHERE store_id IS NULL AND is_active = true
      ORDER BY sort_order ASC, name_ar ASC
      `,
    );
    return result.rows;
  }

  async findById(id: string): Promise<CategoryRow | null> {
    const result = await this.db.query<CategoryRow>(
      `
      SELECT id, store_id, parent_id, name_ar, name_en, image_url, sort_order, is_active
      FROM categories
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
