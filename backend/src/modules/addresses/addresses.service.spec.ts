import { BadRequestException } from '@nestjs/common';
import { AddressesService } from './addresses.service';

describe('AddressesService geography validation', () => {
  it('rejects creating an address when the selected zone does not match its geography', async () => {
    const repo = {
      findActiveZoneGeography: jest.fn().mockResolvedValue({ city_id: 'city-1', district_id: 'district-1' }),
      validateAddressGeography: jest.fn().mockResolvedValue(false),
    };
    const service = new AddressesService(repo as any);

    await expect(service.create('customer-1', {
      label: 'المنزل',
      addressLine: 'شارع الجامعة',
      latitude: 15.4,
      longitude: 45.3,
      cityId: 'city-1',
      districtId: 'district-1',
      zoneId: 'zone-2',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fills omitted city and district from the selected zone when creating an address', async () => {
    const now = new Date();
    const row = {
      id: 'address-1', user_id: 'customer-1', label: 'المنزل',
      address_line: 'شارع الجامعة', building: null, floor: null, apartment: null,
      landmark: null, latitude: 15.4, longitude: 45.3, zone_id: 'zone-1',
      city_id: 'city-1', district_id: 'district-1', area_id: null,
      is_default: false, created_at: now, updated_at: now,
    };
    const repo = {
      findActiveZoneGeography: jest.fn().mockResolvedValue({
        city_id: 'city-1', district_id: 'district-1',
      }),
      validateAddressGeography: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue(row),
    };
    const service = new AddressesService(repo as any);

    await service.create('customer-1', {
      label: 'المنزل', addressLine: 'شارع الجامعة',
      latitude: 15.4, longitude: 45.3, zoneId: 'zone-1',
    });

    expect(repo.validateAddressGeography).toHaveBeenCalledWith({
      cityId: 'city-1', districtId: 'district-1', areaId: undefined, zoneId: 'zone-1',
    });
    expect(repo.create).toHaveBeenCalledWith('customer-1', expect.objectContaining({
      zoneId: 'zone-1', cityId: 'city-1', districtId: 'district-1',
    }));
  });

  it('validates the combined existing and changed geography when updating an address', async () => {
    const repo = {
      findByIdForUser: jest.fn().mockResolvedValue({
        id: 'address-1', zone_id: 'zone-1', city_id: 'city-1',
        district_id: 'district-1', area_id: 'area-1',
      }),
      findActiveZoneGeography: jest.fn().mockResolvedValue({ city_id: 'city-2', district_id: 'district-2' }),
      validateAddressGeography: jest.fn().mockResolvedValue(false),
    };
    const service = new AddressesService(repo as any);

    await expect(service.update('customer-1', 'address-1', {
      zoneId: 'zone-2',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.validateAddressGeography).toHaveBeenCalledWith({
      cityId: 'city-1', districtId: 'district-1', areaId: 'area-1', zoneId: 'zone-2',
    });
  });

  it('backfills missing city and district when assigning a zone to a legacy address', async () => {
    const updatedAt = new Date();
    const row = {
      id: 'address-legacy', user_id: 'customer-1', label: 'المنزل',
      address_line: 'شارع الجامعة', building: null, floor: null, apartment: null,
      landmark: null, latitude: 15.4, longitude: 45.3, zone_id: 'zone-1',
      city_id: 'city-1', district_id: 'district-1', area_id: null,
      is_default: false, created_at: updatedAt, updated_at: updatedAt,
    };
    const repo = {
      findByIdForUser: jest.fn().mockResolvedValue({
        id: 'address-legacy', zone_id: null, city_id: null,
        district_id: null, area_id: null,
      }),
      findActiveZoneGeography: jest.fn().mockResolvedValue({
        city_id: 'city-1', district_id: 'district-1',
      }),
      validateAddressGeography: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(row),
    };
    const service = new AddressesService(repo as any);

    await service.update('customer-1', 'address-legacy', { zoneId: 'zone-1' });

    expect(repo.validateAddressGeography).toHaveBeenCalledWith({
      cityId: 'city-1', districtId: 'district-1', areaId: null, zoneId: 'zone-1',
    });
    expect(repo.update).toHaveBeenCalledWith('address-legacy', 'customer-1', {
      zoneId: 'zone-1', cityId: 'city-1', districtId: 'district-1', areaId: null,
    });
  });

  it('allows saving a GPS address with a verified city but without a delivery zone', async () => {
    const now = new Date();
    const repo = {
      validateAddressGeographyWithoutZone: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({
        id: 'address-1', user_id: 'customer-1', label: 'المنزل',
        address_line: 'شارع الجامعة', building: null, floor: null, apartment: null,
        landmark: null, latitude: 15.4, longitude: 45.3, zone_id: null,
        city_id: 'city-1', district_id: null, area_id: null,
        is_default: false, created_at: now, updated_at: now,
      }),
    };
    const service = new AddressesService(repo as any);
    const result = await service.create('customer-1', {
      label: 'المنزل', addressLine: 'شارع الجامعة',
      latitude: 15.4, longitude: 45.3, cityId: 'city-1',
    });
    expect(result.zoneId).toBeNull();
    expect(repo.validateAddressGeographyWithoutZone).toHaveBeenCalledWith({
      cityId: 'city-1', districtId: undefined, areaId: undefined,
    });
  });

  it('rejects unverified locality references when saving without a delivery zone', async () => {
    const repo = { validateAddressGeographyWithoutZone: jest.fn().mockResolvedValue(false) };
    const service = new AddressesService(repo as any);
    await expect(service.create('customer-1', {
      label: 'المنزل', addressLine: 'شارع الجامعة',
      latitude: 15.4, longitude: 45.3, districtId: 'legacy-district',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});