import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { StoreQueryDto } from './dto/store-query.dto';
import { StoresRepository, StoreRow } from './stores.repository';

export interface StoreResponse {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descriptionAr: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  acceptsOrders: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  avgPrepMinutes: number;
  ratingAvg: number;
  ratingCount: number;
}

@Injectable()
export class StoresService {
  constructor(private readonly repo: StoresRepository) {}

  async list(query: StoreQueryDto): Promise<Paginated<StoreResponse>> {
    const { rows, total } = await this.repo.list(query);
    return buildPage(rows.map((r) => this.toResponse(r)), total, query);
  }

  async get(id: string): Promise<StoreResponse> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Store not found',
      });
    }
    return this.toResponse(row);
  }

  private toResponse(row: StoreRow): StoreResponse {
    return {
      id: row.id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      slug: row.slug,
      descriptionAr: row.description_ar,
      logoUrl: row.logo_url,
      coverUrl: row.cover_url,
      phone: row.phone,
      addressText: row.address_text,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      isOpen: row.is_open,
      acceptsOrders: row.accepts_orders,
      deliveryFee: Number(row.delivery_fee),
      minOrderAmount: Number(row.min_order_amount),
      avgPrepMinutes: row.avg_prep_minutes,
      ratingAvg: Number(row.rating_avg),
      ratingCount: row.rating_count,
    };
  }
}
