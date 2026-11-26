import { DispatchRepository } from './dispatch.repository';

describe('DispatchRepository nearby driver eligibility', () => {
  it('fails closed when store coordinates are invalid', async () => {
    const db = { query: jest.fn() };
    const repository = new DispatchRepository(db as any);

    await expect(repository.findNearbyAvailableDrivers({
      storeLat: Number.NaN,
      storeLng: 45.3,
      limit: 3,
    })).resolves.toEqual([]);

    expect(db.query).not.toHaveBeenCalled();
  });

  it('only selects active online drivers with fresh valid locations within 30 km', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    const repository = new DispatchRepository(db as any);

    await repository.findNearbyAvailableDrivers({
      storeLat: 15.4,
      storeLng: 45.3,
      excludeDriverIds: ['00000000-0000-4000-8000-000000000001'],
      limit: 3,
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain("d.availability = 'online'");
    expect(sql).toContain("d.last_location_at >= now() - interval '15 minutes'");
    expect(sql).toContain('d.last_latitude IS NOT NULL');
    expect(sql).toContain('d.last_longitude IS NOT NULL');
    expect(sql).toContain('d.last_latitude BETWEEN -90 AND 90');
    expect(sql).toContain('d.last_longitude BETWEEN -180 AND 180');
    expect(sql).toContain('WHERE distance_km <= 30');
    expect(sql).toContain('d.user_id <> ALL($4::uuid[])');
    expect(params).toEqual([
      15.4,
      45.3,
      3,
      ['00000000-0000-4000-8000-000000000001'],
    ]);
  });
  it('does not create an offer after the order has been assigned', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ status: 'driverAssigned', driver_id: 'driver-accepted' }],
      }),
    };
    const db = {
      transaction: jest.fn(async (work: (client: any) => Promise<unknown>) => work(client)),
    };
    const repository = new DispatchRepository(db as any);

    await expect(repository.createOffer({
      orderId: 'order-1',
      driverId: 'driver-next',
      expiresAt: new Date(),
      roundNumber: 2,
      tier: 1,
      distanceKm: 2,
      mode: 'auto',
    })).resolves.toBeNull();

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls[0][1]).toEqual(['order-1']);
  });

  it('locks a ready unassigned order before inserting its offer', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ status: 'ready', driver_id: null }] })
        .mockResolvedValueOnce({ rows: [{ id: 'offer-1' }] }),
    };
    const db = {
      transaction: jest.fn(async (work: (client: any) => Promise<unknown>) => work(client)),
    };
    const repository = new DispatchRepository(db as any);

    await expect(repository.createOffer({
      orderId: 'order-1',
      driverId: 'driver-1',
      expiresAt: new Date(),
      roundNumber: 1,
      tier: 1,
      distanceKm: 2,
      mode: 'auto',
    })).resolves.toEqual({ id: 'offer-1' });

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls[1][0]).toContain('INSERT INTO driver_assignments');
  });

});
