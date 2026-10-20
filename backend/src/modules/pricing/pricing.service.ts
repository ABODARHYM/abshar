import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { PricingRepository, ZoneRow } from './pricing.repository';
import { DeliveryQuoteDto, ZoneResponseDto } from './dto/pricing-response.dto';

export interface PricingContext {
  storeId: string;
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
  deliveryFee: number;
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
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly repo: PricingRepository) {}

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
    // 1) اقرأ settings
    const settings = await this.repo.getPricingSettings();

    const globalDefaultFee = settings['default_delivery_fee'] ?? 500;
    const minFee = settings['min_delivery_fee'] ?? 0;
    const maxFee = settings['max_delivery_fee'] ?? 5000;
    const globalSurge = settings['surge_multiplier'] ?? 1.0;
    const globalFuel = settings['fuel_surcharge'] ?? 0;
    const globalFreeThreshold = settings['free_delivery_threshold'] ?? 0;

    // 2) احسب المسافة
    let distanceKm = 0;
    try {
      distanceKm = await this.repo.calculateDistanceKm(
        ctx.storeLat,
        ctx.storeLng,
        ctx.addressLat,
        ctx.addressLng,
      );
    } catch (err) {
      this.logger.warn(`Distance calculation failed: ${(err as Error).message}`);
    }

    // 3) جرّب zone
    let zone: ZoneRow | null = null;
    try {
      zone = await this.repo.findZoneForLocation({
        city: ctx.city,
        latitude: ctx.addressLat,
        longitude: ctx.addressLng,
      });
    } catch (err) {
      this.logger.warn(`Zone lookup failed: ${(err as Error).message}`);
    }

    let baseFee = 0;
    let distanceFee = 0;
    let fuelSurcharge = 0;
    let surgeMultiplier = globalSurge;
    let freeThreshold: number | null = null;
    let source: 'zone' | 'store' | 'global';
    let zoneId: string | null = null;
    let zoneName: string | null = null;

    if (zone) {
      // ═══ 1) Zone-based ═══
      source = 'zone';
      zoneId = zone.id;
      zoneName = zone.name_ar;

      baseFee = Number(zone.base_delivery_fee);
      const perKm = Number(zone.fee_per_km);
      distanceFee = distanceKm * perKm;
      fuelSurcharge = Number(zone.fuel_surcharge) + globalFuel;
      surgeMultiplier = Number(zone.surge_multiplier) * globalSurge;
      freeThreshold = zone.free_delivery_threshold !== null
        ? Number(zone.free_delivery_threshold)
        : (globalFreeThreshold > 0 ? globalFreeThreshold : null);
    } else if (ctx.storeDeliveryFee > 0) {
      // ═══ 2) Store fallback ═══
      source = 'store';
      baseFee = ctx.storeDeliveryFee;
      fuelSurcharge = globalFuel;
      freeThreshold = globalFreeThreshold > 0 ? globalFreeThreshold : null;
    } else {
      // ═══ 3) Global fallback ═══
      source = 'global';
      baseFee = globalDefaultFee;
      fuelSurcharge = globalFuel;
      freeThreshold = globalFreeThreshold > 0 ? globalFreeThreshold : null;
    }

    // 4) احسب قبل الطلب
    let feeBeforeThreshold = (baseFee + distanceFee + fuelSurcharge) * surgeMultiplier;

    // 5) Free delivery threshold
    const isFreeDelivery = freeThreshold !== null && ctx.subtotal >= freeThreshold;
    if (isFreeDelivery) {
      feeBeforeThreshold = 0;
    }

    // 6) Min/Max caps
    let finalFee = feeBeforeThreshold;
    if (!isFreeDelivery) {
      if (finalFee < minFee) finalFee = minFee;
      if (finalFee > maxFee) finalFee = maxFee;
    }

    // 7) round
    finalFee = Math.round(finalFee * 100) / 100;
    distanceKm = Math.round(distanceKm * 100) / 100;

    const total = Math.round((ctx.subtotal + finalFee) * 100) / 100;

    return {
      deliveryFee: finalFee,
      distanceKm,
      baseFee: Math.round(baseFee * 100) / 100,
      distanceFee: Math.round(distanceFee * 100) / 100,
      fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
      surgeMultiplier,
      total,
      freeDeliveryThreshold: freeThreshold,
      isFreeDelivery,
      source,
      zoneId,
      zoneName,
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
      currency: ctx.currency,
    };
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
