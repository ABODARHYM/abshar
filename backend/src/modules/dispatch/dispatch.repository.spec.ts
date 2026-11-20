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
});
