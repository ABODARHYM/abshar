import { BadRequestException } from '@nestjs/common';
import { AddressesService } from './addresses.service';

describe('AddressesService geography validation', () => {
  it('rejects creating an address when the selected zone does not match its geography', async () => {
    const repo = { validateAddressGeography: jest.fn().mockResolvedValue(false) };
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

  it('validates the combined existing and changed geography when updating an address', async () => {
    const repo = {
      findByIdForUser: jest.fn().mockResolvedValue({
        id: 'address-1', zone_id: 'zone-1', city_id: 'city-1',
        district_id: 'district-1', area_id: 'area-1',
      }),
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

  it('rejects geography fields without a delivery zone', async () => {
    const repo = {};
    const service = new AddressesService(repo as any);
    await expect(service.create('customer-1', {
      label: 'المنزل', addressLine: 'شارع الجامعة',
      latitude: 15.4, longitude: 45.3, cityId: 'city-1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});