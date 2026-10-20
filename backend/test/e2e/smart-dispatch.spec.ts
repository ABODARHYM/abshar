/**
 * Smart Dispatch Test
 */

const DISPATCH_API = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';

async function login(identifier: string, password: string): Promise<string> {
  const res = await fetch(`${DISPATCH_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data: any = await res.json();
  return data.tokens.accessToken;
}

async function api(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${DISPATCH_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

describe('Smart Dispatch', () => {
  let customerToken: string;
  let storeToken: string;
  let driverToken: string;

  beforeAll(async () => {
    customerToken = await login('test@example.com', 'Test12345');
    storeToken = await login('store@example.com', 'Test12345');
    driverToken = await login('driver@example.com', 'Test12345');
  });

  it('Creates dispatch offers when order becomes ready', async () => {
    // 1) العنوان
    const addrRes: any = await (await api('/addresses', customerToken)).json();
    const addressId = addrRes[0].id;

    // 2) المتجر
    const storesRes: any = await (await api('/stores', customerToken)).json();
    const storeId = storesRes.items[0].id;

    // 3) المنتج
    const prodsRes: any = await (await api(`/products?storeId=${storeId}&limit=1`, customerToken)).json();
    const productId = prodsRes.items[0].id;

    // 4) أنشئ الطلب
    const orderRes: any = await (await api('/orders', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        addressId,
        idempotencyKey: `sd-${Date.now()}`,
        items: [{ productId, quantity: 1 }],
      }),
    })).json();
    const orderId = orderRes.id;

    // 5) المتجر يقبل + يحضّر + يجهّز
    await api(`/store-owner/orders/${orderId}/accept`, storeToken, { method: 'PATCH' });
    await api(`/store-owner/orders/${orderId}/preparing`, storeToken, { method: 'PATCH' });
    await api(`/store-owner/orders/${orderId}/ready`, storeToken, { method: 'PATCH' });

    // 6) انتظر Dispatch
    await new Promise(r => setTimeout(r, 2000));

    // 7) المندوب يرى العرض
    const notifsRes: any = await (await api('/notifications?limit=10', driverToken)).json();
    const offer = notifsRes.items.find(
      (n: any) => n.type === 'ORDER_READY' && n.data && n.data.orderId === orderId,
    );

    expect(offer).toBeTruthy();
    if (offer) {
      expect(offer.data.action).toBe('available');
      expect(offer.data.distanceKm).toBeDefined();
    }
  });
});
