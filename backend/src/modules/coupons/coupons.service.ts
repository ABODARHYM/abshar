import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { CouponsRepository, CouponRow } from './coupons.repository';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import {
  CouponResponseDto,
  CouponValidationDto,
} from './dto/coupon-response.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  async validate(
    userId: string,
    dto: ValidateCouponDto,
  ): Promise<CouponValidationDto> {
    const coupon = await this.repo.findByCode(dto.code);
    if (!coupon) return this.invalid('الكوبون غير موجود');
    if (!coupon.is_active) return this.invalid('الكوبون غير مفعّل');

    const now = new Date();
    if (coupon.starts_at && coupon.starts_at > now) return this.invalid('الكوبون لم يبدأ بعد');
    if (coupon.expires_at && coupon.expires_at < now) return this.invalid('انتهت صلاحية الكوبون');

    const minOrder = Number(coupon.min_order_amount);
    if (dto.subtotal < minOrder) return this.invalid(`الحد الأدنى للطلب ${minOrder}`);

    if (coupon.store_id && dto.storeId && coupon.store_id !== dto.storeId) {
      return this.invalid('الكوبون لا ينطبق على هذا المتجر');
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return this.invalid('استُنفد الكوبون');
    }

    if (coupon.per_user_limit !== null) {
      const usage = await this.repo.countUserUsage(coupon.id, userId);
      if (usage >= coupon.per_user_limit) return this.invalid('استخدمت هذا الكوبون من قبل');
    }

    const discount = this.computeDiscount(coupon, dto.subtotal);
    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discountAmount: discount,
      finalSubtotal: Math.max(0, dto.subtotal - discount),
      message: null,
    };
  }

  computeDiscount(coupon: CouponRow, subtotal: number): number {
    const value = Number(coupon.value);
    switch (coupon.type) {
      case 'percentage': {
        let d = (subtotal * value) / 100;
        if (coupon.max_discount_amount !== null) {
          const cap = Number(coupon.max_discount_amount);
          if (d > cap) d = cap;
        }
        return Math.min(d, subtotal);
      }
      case 'fixed':
        return Math.min(value, subtotal);
      case 'free_delivery':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * تسجيل استخدام الكوبون بعد إنشاء الطلب.
   * يستدعيه OrdersService.
   */
  async recordUsage(
    userId: string,
    couponId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.repo.insertUsageInTransaction(
      userId,
      couponId,
      orderId,
      discountAmount,
    );
  }

  async validateAndCompute(
    userId: string,
    code: string,
    subtotal: number,
    storeId: string,
  ): Promise<{
    coupon: CouponRow;
    discountAmount: number;
    freeDelivery: boolean;
  }> {
    const result = await this.validate(userId, { code, subtotal, storeId });
    if (!result.valid || !result.couponId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: result.message ?? 'كوبون غير صالح',
      });
    }
    const coupon = await this.repo.findById(result.couponId);
    if (!coupon) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Coupon not found' });
    return {
      coupon,
      discountAmount: result.discountAmount,
      freeDelivery: coupon.type === 'free_delivery',
    };
  }

  async list(query: {
    page: number;
    limit: number;
    isActive?: boolean;
  }): Promise<Paginated<CouponResponseDto>> {
    const { rows, total } = await this.repo.list(query);
    return buildPage(rows.map((c) => this.toResponse(c)), total, query);
  }

  async get(id: string): Promise<CouponResponseDto> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Coupon not found' });
    return this.toResponse(c);
  }

  async create(actorId: string, dto: CreateCouponDto): Promise<CouponResponseDto> {
    if (dto.type === 'percentage' && dto.value > 100) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'النسبة يجب أن تكون 0-100',
      });
    }
    const existing = await this.repo.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.Conflict,
        message: 'كود الكوبون مستخدم بالفعل',
      });
    }
    const row = await this.repo.create(
      {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        min_order_amount: dto.minOrderAmount,
        max_discount_amount: dto.maxDiscountAmount,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        usage_limit: dto.usageLimit,
        per_user_limit: dto.perUserLimit,
        store_id: dto.storeId,
        category_id: dto.categoryId,
        is_active: dto.isActive,
      } as any,
      actorId,
    );
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
    const row = await this.repo.update(id, dto as Record<string, unknown>);
    if (!row) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Coupon not found' });
    return this.toResponse(row);
  }

  async remove(id: string): Promise<{ status: string }> {
    const ok = await this.repo.softDelete(id);
    if (!ok) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Coupon not found' });
    return { status: 'ok' };
  }

  private invalid(message: string): CouponValidationDto {
    return {
      valid: false,
      couponId: null,
      code: null,
      type: null,
      discountAmount: 0,
      finalSubtotal: 0,
      message,
    };
  }

  private toResponse(c: CouponRow): CouponResponseDto {
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: Number(c.min_order_amount),
      maxDiscountAmount: c.max_discount_amount !== null ? Number(c.max_discount_amount) : null,
      startsAt: c.starts_at ? c.starts_at.toISOString() : null,
      expiresAt: c.expires_at ? c.expires_at.toISOString() : null,
      usageLimit: c.usage_limit,
      perUserLimit: c.per_user_limit,
      usedCount: c.used_count,
      storeId: c.store_id,
      categoryId: c.category_id,
      isActive: c.is_active,
      createdAt: c.created_at.toISOString(),
    };
  }
}
