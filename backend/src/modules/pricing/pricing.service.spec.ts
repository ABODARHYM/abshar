import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  }], zoneOverride: any = zone) {
    const repo = {
      getZoneById: jest.fn().mockResolvedValue(zoneOverride),
      calculateDistanceKm: jest.fn().mockResolvedValue(4.2),
      listActiveDistanceTiers: jest.fn().mockResolvedValue(tiers),
      getPricingSettings: jest.fn().mockResolvedValue({}),
      findAddressForUser: jest.fn().mockResolvedValue({ zone_id: 'zone-1', latitude: 15.41, longitude: 45.31 }),
    };
    return { service: new PricingService(repo as any), repo };
  }

  it('resolves quote coordinates and zone from the authenticated customer address', async () => {
    const { service, repo } = makeService();
    await expect(service.getAddressForQuote('address-1', 'customer-1')).resolves.toEqual({
      zoneId: 'zone-1', addressLat: 15.41, addressLng: 45.31,
    });
    expect(repo.findAddressForUser).toHaveBeenCalledWith('address-1', 'customer-1');
  });

  it('rejects quote lookup when the address is not owned by the customer', async () => {
    const { service, repo } = makeService();
    repo.findAddressForUser.mockResolvedValue(null);
    await expect(service.getAddressForQuote('address-1', 'other-customer')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects quote lookup for an address without a delivery zone', async () => {
    const { service, repo } = makeService();
    repo.findAddressForUser.mockResolvedValue({ zone_id: null, latitude: 15.41, longitude: 45.31 });
    await expect(service.getAddressForQuote('address-1', 'customer-1')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('uses the configured fee for the matching distance band', async () => {
    const { service } = makeService();
    const result = await service.calculate(context);
    expect(result.deliveryFee).toBe(700);
    expect(result.originalDeliveryFee).toBe(700);
    expect(result.distanceKm).toBe(4.2);
    expect(result.distanceTierId).toBe('tier-2-5');
    expect(result.zoneId).toBe('zone-1');
    expect(result.source).toBe('zone');
  });

  it('preserves the original tier fee when the free-delivery threshold waives the customer fee', async () => {
    const { service } = makeService(undefined, { ...zone, free_delivery_threshold: 500 });
    const result = await service.calculate(context);
    expect(result.deliveryFee).toBe(0);
    expect(result.originalDeliveryFee).toBe(700);
    expect(result.isFreeDelivery).toBe(true);
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
