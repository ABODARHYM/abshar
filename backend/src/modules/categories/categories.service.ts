import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { CategoriesRepository, CategoryRow } from './categories.repository';

export interface CategoryResponse {
  id: string;
  storeId: string | null;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  sortOrder: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async listPlatform(): Promise<CategoryResponse[]> {
    const rows = await this.repo.listPlatform();
    return rows.map((r) => this.toResponse(r));
  }

  async get(id: string): Promise<CategoryResponse> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Category not found',
      });
    }
    return this.toResponse(row);
  }

  private toResponse(row: CategoryRow): CategoryResponse {
    return {
      id: row.id,
      storeId: row.store_id,
      parentId: row.parent_id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      imageUrl: row.image_url,
      sortOrder: row.sort_order,
    };
  }
}
