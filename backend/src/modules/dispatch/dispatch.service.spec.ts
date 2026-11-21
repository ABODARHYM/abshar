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

  function makeService(currentRound: number, availableDrivers = [driver]) {
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
      findNearbyAvailableDrivers: jest.fn().mockResolvedValue(availableDrivers),
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

  it('creates offers for all three eligible drivers in one tier', async () => {
    const drivers = Array.from({ length: 3 }, (_, index) => ({
      ...driver,
      user_id: `driver-${index + 1}`,
      distance_km: String(index + 1),
    }));
    const { service, repo, notifications } = makeService(0, drivers);
    notifications.notifyDriverNewTask.mockResolvedValue(undefined);

    const result = await service.dispatchOrder(params);

    expect(result.driversOffered).toBe(3);
    expect(repo.createOffer).toHaveBeenCalledTimes(3);
    expect(notifications.notifyDriverNewTask).toHaveBeenCalledTimes(3);
  });

  it('broadcasts offers to every eligible driver in the final round', async () => {
    const drivers = Array.from({ length: 4 }, (_, index) => ({
      ...driver,
      user_id: `driver-${index + 1}`,
      distance_km: String(index + 1),
    }));
    const { service, repo, notifications } = makeService(3, drivers);
    notifications.notifyDriverNewTask.mockResolvedValue(undefined);

    const result = await service.dispatchOrder(params);

    expect(result.usesBroadcast).toBe(true);
    expect(result.driversOffered).toBe(4);
    expect(repo.findNearbyAvailableDrivers).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    expect(repo.createOffer).toHaveBeenCalledTimes(4);
    expect(notifications.notifyDriverNewTask).toHaveBeenCalledTimes(4);
  });
  it('keeps an offer when its notification is successfully queued', async () => {
    const { service, repo, notifications } = makeService(0);
    notifications.notifyDriverNewTask.mockResolvedValue(undefined);

    const result = await service.dispatchOrder(params);

    expect(repo.removeOffer).not.toHaveBeenCalled();
    expect(result.driversOffered).toBe(1);
  });
});
