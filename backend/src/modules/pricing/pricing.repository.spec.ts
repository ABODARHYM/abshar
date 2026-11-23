import { ServiceUnavailableException } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';

describe('PricingRepository road routing provider', () => {
  const originalUrl = process.env.ROUTING_API_URL;
  const originalKey = process.env.ROUTING_API_KEY;
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.ROUTING_API_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/json';
    process.env.ROUTING_API_KEY = 'test-api-key';
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.ROUTING_API_URL;
    else process.env.ROUTING_API_URL = originalUrl;
    if (originalKey === undefined) delete process.env.ROUTING_API_KEY;
    else process.env.ROUTING_API_KEY = originalKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const repository = () => new PricingRepository({} as any);

  it('uses the configured HTTPS route endpoint and returns its road distance', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ routes: [{ summary: { distance: 4250 } }] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31)).resolves.toBe(4.25);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.heigit.org/openrouteservice/v2/directions/driving-car/json');
    expect(options).toEqual(expect.objectContaining({
      method: 'POST', redirect: 'error',
      headers: { 'content-type': 'application/json', authorization: 'test-api-key' },
      body: JSON.stringify({ coordinates: [[45.3, 15.4], [45.31, 15.41]], units: 'm' }),
    }));
  });

  it('fails closed when the routing provider is not configured', async () => {
    delete process.env.ROUTING_API_URL;
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the ORS API key is missing', async () => {
    delete process.env.ROUTING_API_KEY;
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-ORS endpoints', async () => {
    process.env.ROUTING_API_URL = 'https://routing.example.test/route';
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, ' ', -1, 501, 'not-a-number'])(
    'rejects malformed or out-of-range route distance %s',
    async (distanceKm) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ routes: [{ summary: { distance: typeof distanceKm === 'number' ? distanceKm * 1000 : distanceKm } }] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }));
      await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
        .rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it('rejects non-success provider responses without a distance fallback', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});


describe('PricingRepository updateZoneCoverage SQL parameter typing', () => {
  it('casts the status parameter consistently in assignment and CASE expressions', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'zone-1' }] });
    const repository = new PricingRepository({ query } as any);

    await expect(repository.updateZoneCoverage({
      zoneId: 'zone-1',
      geojson: { type: 'Polygon', coordinates: [] },
      status: 'verified',
      actorId: '00000000-0000-4000-8000-000000000001',
      note: 'Reviewed boundary',
    })).resolves.toBe(true);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('coverage_status = $3::text');
    expect(sql).toContain("CASE WHEN $3::text = 'verified'");
    expect(sql).toContain("CASE WHEN $3::text <> 'verified'");
    expect(params[2]).toBe('verified');
  });
});
