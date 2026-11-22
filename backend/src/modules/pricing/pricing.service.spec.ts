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
      isZoneVerifiedForDelivery: jest.fn().mockResolvedValue(true),
      getZoneCoverage: jest.fn().mockResolvedValue({"type":"Polygon","coordinates":[[[45.3,15.4],[45.32,15.4],[45.32,15.42],[45.3,15.42],[45.3,15.4]]]}),
      calculateRouteDistanceKm: jest.fn().mockResolvedValue(4.2),
      listActiveDistanceTiers: jest.fn().mockResolvedValue(tiers),
      getPricingSettings: jest.fn().mockResolvedValue({}),
      findAddressForUser: jest.fn().mockResolvedValue({ zone_id: 'zone-1', latitude: 15.41, longitude: 45.31 }),
      updateZoneCoverage: jest.fn().mockResolvedValue(true),
      updateZone: jest.fn().mockResolvedValue({ ...zone, is_active: true }),
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

  it('blocks activation of a zone without verified coverage', async () => {
    const { service, repo } = makeService();
    repo.isZoneVerifiedForDelivery.mockResolvedValue(false);
    await expect(service.updateZone('zone-1', { isActive: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateZone).not.toHaveBeenCalled();
  });

  it('blocks activation when no active distance tier exists', async () => {
    const { service, repo } = makeService([]);
    await expect(service.updateZone('zone-1', { isActive: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateZone).not.toHaveBeenCalled();
  });

  it('blocks activation when a secure routing provider is not configured', async () => {
    const previous = process.env.ROUTING_API_URL;
    delete process.env.ROUTING_API_URL;
    try {
      const { service, repo } = makeService();
      await expect(service.updateZone('zone-1', { isActive: true })).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.updateZone).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.ROUTING_API_URL;
      else process.env.ROUTING_API_URL = previous;
    }
  });

  it('requires a valid closed GeoJSON polygon and an audit note before approving coverage', async () => {
    const { service, repo } = makeService();
    await expect(service.updateZoneCoverage({
      zoneId: 'zone-1', status: 'verified', actorId: 'admin-1', note: 'اعتماد حدود المنطقة',
      geojson: { type: 'Polygon', coordinates: [[[45, 15], [46, 15], [46, 16], [45, 16]]] },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateZoneCoverage).not.toHaveBeenCalled();
  });

  it('rejects self-intersecting delivery coverage polygons', async () => {
    const { service, repo } = makeService();
    await expect(service.updateZoneCoverage({
      zoneId: 'zone-1', status: 'verified', actorId: 'admin-1', note: 'حدود غير صالحة',
      geojson: { type: 'Polygon', coordinates: [[[45, 15], [46, 16], [45, 16], [46, 15], [45, 15]]] },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateZoneCoverage).not.toHaveBeenCalled();
  });

  it('stores an explicitly approved valid delivery polygon with the administrator identity', async () => {
    const { service, repo } = makeService();
    const geojson = { type: 'Polygon', coordinates: [[[45, 15], [46, 15], [46, 16], [45, 16], [45, 15]]] };
    await expect(service.updateZoneCoverage({
      zoneId: 'zone-1', status: 'verified', actorId: 'admin-1', note: 'تم التحقق من الحدود', geojson,
    })).resolves.toEqual({ status: 'ok' });
    expect(repo.updateZoneCoverage).toHaveBeenCalledWith(expect.objectContaining({
      zoneId: 'zone-1', status: 'verified', actorId: 'admin-1', geojson,
    }));
  });

  it('rejects a customer location outside the approved zone polygon before routing', async () => {
    const { service, repo } = makeService();
    repo.getZoneCoverage.mockResolvedValue({
      type: 'Polygon', coordinates: [[[45.0, 15.0], [45.1, 15.0], [45.1, 15.1], [45.0, 15.1], [45.0, 15.0]]],
    });
    await expect(service.calculate(context)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.calculateRouteDistanceKm).not.toHaveBeenCalled();
  });

  it('rejects an unverified legacy zone before requesting a route or charging a fee', async () => {
    const { service, repo } = makeService();
    repo.isZoneVerifiedForDelivery.mockResolvedValue(false);
    await expect(service.calculate(context)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.calculateRouteDistanceKm).not.toHaveBeenCalled();
    expect(repo.listActiveDistanceTiers).not.toHaveBeenCalled();
  });

  it('does not fall back to straight-line distance when the routing provider is unavailable', async () => {
    const { service, repo } = makeService();
    repo.calculateRouteDistanceKm.mockRejectedValue(new Error('routing unavailable'));
    await expect(service.calculate(context)).rejects.toThrow('routing unavailable');
    expect(repo.listActiveDistanceTiers).not.toHaveBeenCalled();
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
