import { DispatchService } from './dispatch.service';

describe('DispatchService offer notification lifecycle', () => {
  const driver = {
    user_id: 'driver-1',
    full_name: 'Driver',
    latitude: 15.4,
    longitude: 45.3,
    distance_km: '2.5',
    rating_avg: 4.8,
    availability: 'online',
  };

  function makeService(currentRound: number) {
    const repo = {
      getStoreInfo: jest.fn().mockResolvedValue({
        id: 'store-1',
        name_ar: 'متجر',
        latitude: 15.4,
        longitude: 45.3,
        zone_id: 'zone-1',
      }),
      getCurrentRound: jest.fn().mockResolvedValue(currentRound),
      getOfferedDriverIds: jest.fn().mockResolvedValue([]),
      findNearbyAvailableDrivers: jest.fn().mockResolvedValue([driver]),
      createOffer: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      removeOffer: jest.fn().mockResolvedValue(undefined),
    };
    const notifications = {
      notifyDriverNewTask: jest.fn().mockRejectedValue(new Error('notification unavailable')),
    };
    return {
      service: new DispatchService(repo as any, notifications as any),
      repo,
      notifications,
    };
  }

  const params = {
    orderId: 'order-1',
    orderNumber: 'ORD-1',
    storeId: 'store-1',
    deliveryArea: 'حي الجامعة',
  };

  it('removes a tier offer when its notification cannot be queued', async () => {
    const { service, repo } = makeService(0);

    const result = await service.dispatchOrder(params);

    expect(repo.createOffer).toHaveBeenCalledTimes(1);
    expect(repo.removeOffer).toHaveBeenCalledWith('order-1', 'driver-1');
    expect(result.driversOffered).toBe(0);
  });

  it('removes a broadcast offer when its notification cannot be queued', async () => {
    const { service, repo } = makeService(3);

    const result = await service.dispatchOrder(params);

    expect(repo.createOffer).toHaveBeenCalledTimes(1);
    expect(repo.removeOffer).toHaveBeenCalledWith('order-1', 'driver-1');
    expect(result.driversOffered).toBe(0);
    expect(result.usesBroadcast).toBe(true);
  });

  it('keeps an offer when its notification is successfully queued', async () => {
    const { service, repo, notifications } = makeService(0);
    notifications.notifyDriverNewTask.mockResolvedValue(undefined);

    const result = await service.dispatchOrder(params);

    expect(repo.removeOffer).not.toHaveBeenCalled();
    expect(result.driversOffered).toBe(1);
  });
});
