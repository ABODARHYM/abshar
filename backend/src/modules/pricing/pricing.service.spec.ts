import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';

describe('PricingService distance-tier pricing', () => {
  const zone = {
    id: 'zone-1', city: 'Marib', name_ar: 'المدينة', name_en: 'City',
    base_delivery_fee: 0, fee_per_km: 0, min_order_amount: 0,
    free_delivery_threshold: null, surge_multiplier: 1, fuel_surcharge: 0,
    is_active: true,
  };

  const context = {
    storeId: 'store-1', zoneId: 'zone-1',
    storeLat: 15.4, storeLng: 45.3,
    storeDeliveryFee: 0, storeMinOrderAmount: 0,
    addressLat: 15.41, addressLng: 45.31,
    subtotal: 1000, currency: 'YER',
  };

  function makeService(tiers: any[] = [{
    id: 'tier-2-5', zone_id: 'zone-1', min_distance_km: 2,
    max_distance_km: 5, delivery_fee: 700, is_active: true,
  }]) {
    const repo = {
      getZoneById: jest.fn().mockResolvedValue(zone),
      calculateDistanceKm: jest.fn().mockResolvedValue(4.2),
      listActiveDistanceTiers: jest.fn().mockResolvedValue(tiers),
      getPricingSettings: jest.fn().mockResolvedValue({}),
    };
    return { service: new PricingService(repo as any), repo };
  }

  it('uses the configured fee for the matching distance band', async () => {
    const { service } = makeService();
    const result = await service.calculate(context);
    expect(result.deliveryFee).toBe(700);
    expect(result.distanceKm).toBe(4.2);
    expect(result.distanceTierId).toBe('tier-2-5');
    expect(result.zoneId).toBe('zone-1');
    expect(result.source).toBe('zone');
  });

  it('does not use store or global fallback when address has no zone', async () => {
    const { service } = makeService();
    await expect(service.calculate({ ...context, zoneId: null })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects distances not covered by a configured tier', async () => {
    const { service } = makeService([{
      id: 'tier-0-2', zone_id: 'zone-1', min_distance_km: 0,
      max_distance_km: 2, delivery_fee: 300, is_active: true,
    }]);
    await expect(service.calculate(context)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the next tier at an exact upper boundary', async () => {
    const { service, repo } = makeService([
      { id: 'tier-a', zone_id: 'zone-1', min_distance_km: 0, max_distance_km: 4.2, delivery_fee: 500, is_active: true },
      { id: 'tier-b', zone_id: 'zone-1', min_distance_km: 4.2, max_distance_km: null, delivery_fee: 900, is_active: true },
    ]);
    const result = await service.calculate(context);
    expect(result.deliveryFee).toBe(900);
    expect(repo.listActiveDistanceTiers).toHaveBeenCalledWith('zone-1');
  });
});
