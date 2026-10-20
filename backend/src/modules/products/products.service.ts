import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsRepository, ProductRow } from './products.repository';

export interface ProductResponse {
  id: string;
  storeId: string;
  storeName: string;
  categoryId: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async list(query: ProductQueryDto): Promise<Paginated<ProductResponse>> {
    const { rows, total } = await this.repo.list(query);
    return buildPage(rows.map((r) => this.toResponse(r)), total, query);
  }

  async get(id: string): Promise<ProductResponse> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Product not found',
      });
    }
    return this.toResponse(row);
  }

  private toResponse(row: ProductRow): ProductResponse {
    return {
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      categoryId: row.category_id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      descriptionAr: row.description_ar,
      basePrice: Number(row.base_price),
      imageUrl: row.image_url,
      isAvailable: row.is_available,
    };
  }
}
