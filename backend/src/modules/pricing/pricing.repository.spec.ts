import { ServiceUnavailableException } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';

describe('PricingRepository road routing provider', () => {
  const originalUrl = process.env.ROUTING_API_URL;
  const originalKey = process.env.ROUTING_API_KEY;
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.ROUTING_API_URL = 'https://routing.example.test/route';
    delete process.env.ROUTING_API_KEY;
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
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ distanceKm: 4.25 }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31)).resolves.toBe(4.25);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://routing.example.test/route');
    expect(options).toEqual(expect.objectContaining({
      method: 'POST', redirect: 'error',
      body: JSON.stringify({
        origin: { latitude: 15.4, longitude: 45.3 },
        destination: { latitude: 15.41, longitude: 45.31 },
      }),
    }));
  });

  it('fails closed when the routing provider is not configured', async () => {
    delete process.env.ROUTING_API_URL;
    await expect(repository().calculateRouteDistanceKm(15.4, 45.3, 15.41, 45.31))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, ' ', -1, 501, 'not-a-number'])(
    'rejects malformed or out-of-range route distance %s',
    async (distanceKm) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ distanceKm }), {
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
