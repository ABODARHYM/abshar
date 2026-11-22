import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { DistanceTierRow, PricingRepository, ZoneRow } from './pricing.repository';
import { DeliveryQuoteDto, ZoneResponseDto } from './dto/pricing-response.dto';

export interface PricingContext {
  storeId: string;
  zoneId?: string | null;
  storeLat: number;
  storeLng: number;
  storeDeliveryFee: number;
  storeMinOrderAmount: number;
  addressLat: number;
  addressLng: number;
  subtotal: number;
  city?: string;
  currency: string;
}

interface PricingResult {
  /** Customer-paid fee after threshold discounts. */
  deliveryFee: number;
  /** Full configured tier fee before free-delivery discounts; used for driver earnings. */
  originalDeliveryFee: number;
  distanceKm: number;
  baseFee: number;
  distanceFee: number;
  fuelSurcharge: number;
  surgeMultiplier: number;
  total: number;
  freeDeliveryThreshold: number | null;
  isFreeDelivery: boolean;
  source: 'zone' | 'store' | 'global';
  zoneId: string | null;
  zoneName: string | null;
  distanceTierId: string | null;
  distanceSource: 'routing_api';
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly repo: PricingRepository) {}

  async getStoreQuoteDetails(storeId: string) {
    const store = await this.repo.getStoreQuoteDetails(storeId);
    if (!store) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'المتجر غير موجود أو غير متاح.',
      });
    }
    return {
      storeId: store.id,
      storeLat: Number(store.latitude),
      storeLng: Number(store.longitude),
      storeDeliveryFee: Number(store.delivery_fee),
      storeMinOrderAmount: Number(store.min_order_amount),
      currency: store.currency,
    };
  }

  /**
   * حساب تكلفة التوصيل — pipeline كامل.
   *
   * 1) Zone → base + distance × per_km + surge + fuel
   * 2) Store fallback → store.delivery_fee
   * 3) Global fallback → settings.pricing.default_delivery_fee
   * 4) Free delivery threshold
   * 5) Min/max caps
   * 6) Fuel surcharge (global)
   */
  async calculate(ctx: PricingContext): Promise<PricingResult> {
    if (!ctx.zoneId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'عنوان التوصيل غير مرتبط بمنطقة توصيل. يرجى تحديد المنطقة قبل الطلب.',
      });
    }
    if (!Number.isFinite(ctx.storeLat) || !Number.isFinite(ctx.storeLng) ||
        !Number.isFinite(ctx.addressLat) || !Number.isFinite(ctx.addressLng) ||
        (ctx.storeLat === 0 && ctx.storeLng === 0)) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'تعذر تحديد المسافة لعدم اكتمال إحداثيات المتجر أو العنوان.',
      });
    }

    const zone = await this.repo.getZoneById(ctx.zoneId);
    if (!zone || !zone.is_active) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'منطقة التوصيل غير موجودة أو غير مفعّلة.',
      });
    }

    if (!(await this.repo.isZoneVerifiedForDelivery(zone.id))) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'منطقة التوصيل غير موثقة أو لم تعتمدها الإدارة بعد؛ لا يمكن احتساب رسوم عليها.',
      });
    }

    const distanceKm = Math.round((await this.repo.calculateRouteDistanceKm(
      ctx.storeLat, ctx.storeLng, ctx.addressLat, ctx.addressLng,
    )) * 100) / 100;

    const tiers = await this.repo.listActiveDistanceTiers(zone.id);
    const tier = tiers.find((item) => {
      const min = Number(item.min_distance_km);
      const max = item.max_distance_km === null ? null : Number(item.max_distance_km);
      return distanceKm >= min && (max === null || distanceKm < max);
    });

    if (!tier) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'لا توجد شريحة رسوم توصيل تغطي المسافة إلى هذا العنوان. يرجى التواصل مع الإدارة.',
        details: [{ field: 'deliveryDistance', constraints: ['no active distance tier for this zone'] }],
      });
    }

    const settings = await this.repo.getPricingSettings();
    const globalSurge = settings['surge_multiplier'] ?? 1;
    const globalFuel = settings['fuel_surcharge'] ?? 0;
    const freeThreshold = zone.free_delivery_threshold !== null
      ? Number(zone.free_delivery_threshold)
      : (settings['free_delivery_threshold'] > 0 ? settings['free_delivery_threshold'] : null);
    const isFreeDelivery = freeThreshold !== null && ctx.subtotal >= freeThreshold;
    const tierFee = Math.round(Number(tier.delivery_fee) * 100) / 100;
    const originalDeliveryFee = tierFee;
    const finalFee = isFreeDelivery ? 0 : originalDeliveryFee;
    const total = Math.round((ctx.subtotal + finalFee) * 100) / 100;

    return {
      deliveryFee: finalFee,
      originalDeliveryFee,
      distanceKm,
      baseFee: tierFee,
      distanceFee: 0,
      fuelSurcharge: 0,
      surgeMultiplier: 1,
      total,
      freeDeliveryThreshold: freeThreshold,
      isFreeDelivery,
      source: 'zone',
      zoneId: zone.id,
      zoneName: zone.name_ar,
      distanceTierId: tier.id,
      distanceSource: 'routing_api',
    };
  }

  async getAddressForQuote(addressId: string, userId: string) {
    const address = await this.repo.findAddressForUser(addressId, userId);
    if (!address) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'عنوان التوصيل غير موجود أو لا يتبع حسابك.',
      });
    }
    if (!address.zone_id) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'عنوان التوصيل غير مرتبط بمنطقة توصيل.',
      });
    }
    return {
      zoneId: address.zone_id,
      addressLat: Number(address.latitude),
      addressLng: Number(address.longitude),
    };
  }
  /**
   * حساب سعر توصيل معروض للعميل (بدون إنشاء طلب).
   */
  async quote(ctx: PricingContext): Promise<DeliveryQuoteDto> {
    const r = await this.calculate(ctx);

    return {
      deliveryFee: r.deliveryFee,
      distanceKm: r.distanceKm,
      baseFee: r.baseFee,
      distanceFee: r.distanceFee,
      fuelSurcharge: r.fuelSurcharge,
      surgeMultiplier: r.surgeMultiplier,
      subtotal: ctx.subtotal,
      total: r.total,
      freeDeliveryThreshold: r.freeDeliveryThreshold,
      isFreeDelivery: r.isFreeDelivery,
      source: r.source,
      zoneId: r.zoneId,
      zoneName: r.zoneName,
      distanceTierId: r.distanceTierId,
      currency: ctx.currency,
    };
  }


  async listDistanceTiers(zoneId: string): Promise<DistanceTierRow[]> {
    const zone = await this.repo.getZoneById(zoneId);
    if (!zone) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Delivery zone not found' });
    }
    return this.repo.listActiveDistanceTiers(zoneId);
  }

  async createDistanceTier(input: {
    zoneId: string; minDistanceKm: number; maxDistanceKm: number | null; deliveryFee: number;
  }): Promise<DistanceTierRow> {
    const zone = await this.repo.getZoneById(input.zoneId);
    if (!zone) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Delivery zone not found' });
    }
    try {
      return await this.repo.createDistanceTier(input);
    } catch (error) {
      const e = error as { code?: string; constraint?: string };
      if (e.code === '23514' || e.code === '23505') {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'شريحة المسافة تتداخل مع شريحة نشطة أخرى في المنطقة نفسها.',
        });
      }
      throw error;
    }
  }

  async updateDistanceTier(id: string, fields: {
    minDistanceKm?: number; maxDistanceKm?: number | null; deliveryFee?: number; isActive?: boolean;
  }): Promise<DistanceTierRow> {
    try {
      const row = await this.repo.updateDistanceTier(id, fields);
      if (!row) {
        throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Distance tier not found' });
      }
      return row;
    } catch (error) {
      const e = error as { code?: string };
      if (e.code === '23514' || e.code === '23505') {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'تعديل الشريحة يسبب تداخلاً مع شريحة نشطة أخرى.',
        });
      }
      throw error;
    }
  }

  async deactivateDistanceTier(id: string): Promise<{ status: string }> {
    const row = await this.repo.updateDistanceTier(id, { isActive: false });
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Distance tier not found' });
    }
    return { status: 'ok' };
  }

  async listZones(): Promise<ZoneResponseDto[]> {
    const rows = await this.repo.listActiveZones();
    return rows.map((z) => this.toZoneResponse(z));
  }

  async getZone(id: string): Promise<ZoneResponseDto> {
    const z = await this.repo.getZoneById(id);
    if (!z) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Zone not found',
      });
    }
    return this.toZoneResponse(z);
  }

  async updateZone(
    id: string,
    dto: {
      baseDeliveryFee?: number;
      feePerKm?: number;
      minOrderAmount?: number;
      freeDeliveryThreshold?: number | null;
      surgeMultiplier?: number;
      fuelSurcharge?: number;
      isActive?: boolean;
    },
  ): Promise<ZoneResponseDto> {
    const z = await this.repo.updateZone(id, dto);
    if (!z) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Zone not found',
      });
    }
    return this.toZoneResponse(z);
  }

  async getSettings(): Promise<Record<string, number>> {
    return this.repo.getPricingSettings();
  }

  async updateSettings(
    actorId: string,
    settings: Record<string, number>,
  ): Promise<{ updated: number }> {
    const n = await this.repo.updatePricingSettings(settings, actorId);
    return { updated: n };
  }

  private toZoneResponse(z: ZoneRow): ZoneResponseDto {
    return {
      id: z.id,
      city: z.city,
      cityId: z.city_id ?? null,
      districtId: z.district_id ?? null,
      nameAr: z.name_ar,
      nameEn: z.name_en,
      baseDeliveryFee: Number(z.base_delivery_fee),
      feePerKm: Number(z.fee_per_km),
      minOrderAmount: Number(z.min_order_amount),
      freeDeliveryThreshold:
        z.free_delivery_threshold !== null
          ? Number(z.free_delivery_threshold)
          : null,
      surgeMultiplier: Number(z.surge_multiplier),
      fuelSurcharge: Number(z.fuel_surcharge),
      isActive: z.is_active,
    };
  }
}
