/**
 * E2E Test: دورة الطلب الكاملة
 */

const FLOW_API = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';

interface LoginResponse {
  user: any;
  tokens: { accessToken: string; refreshToken: string };
}

async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${FLOW_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return (await res.json()) as LoginResponse;
}

async function api(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${FLOW_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

describe('Full Order Flow E2E', () => {
  let customerToken: string;
  let storeToken: string;
  let driverToken: string;
  let adminToken: string;

  let orderId: string;
  let orderNumber: string;

  beforeAll(async () => {
    // ═══ 0) تنظيف حالة المندوب قبل الاختبار ═══
    const { execSync } = require('child_process');
    try {
      execSync(
        `psql "postgresql://postgres:postgres@localhost:5432/absher_bi" -c "UPDATE drivers SET availability = 'online' WHERE status = 'active'; DELETE FROM driver_assignments WHERE status = 'offered';"`,
        { stdio: 'ignore' }
      );
      console.log('✅ تم تنظيف حالة المندوب');
    } catch (e) {
      console.warn('⚠️  فشل تنظيف المندوب:', (e as Error).message);
    }

    const customer = await login('test@example.com', 'Test12345');
    customerToken = customer.tokens.accessToken;

    const store = await login('store@example.com', 'Test12345');
    storeToken = store.tokens.accessToken;

    const driver = await login('driver@example.com', 'Test12345');
    driverToken = driver.tokens.accessToken;

    const admin = await login('admin@example.com', 'Test12345');
    adminToken = admin.tokens.accessToken;

    expect(customerToken).toBeTruthy();
    expect(storeToken).toBeTruthy();
    expect(driverToken).toBeTruthy();
    expect(adminToken).toBeTruthy();
  });

  // ═══ 1) العميل ينشئ طلبًا ═══
  it('Customer creates an order', async () => {
    const addrRes: any = await (await api('/addresses', customerToken)).json();
    expect(addrRes.length).toBeGreaterThan(0);
    const addressId = addrRes[0].id;

    const storesRes: any = await (await api('/stores', customerToken)).json();
    expect(storesRes.items.length).toBeGreaterThan(0);
    const storeId = storesRes.items[0].id;

    const prodRes: any = await (await api(`/products?storeId=${storeId}&limit=1`, customerToken)).json();
    const productId = prodRes.items[0].id;

    const orderRes = await api('/orders', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        addressId,
        idempotencyKey: `e2e-${Date.now()}`,
        items: [{ productId, quantity: 1 }],
      }),
    });

    expect(orderRes.status).toBe(201);
    const order: any = await orderRes.json();
    expect(order.id).toBeTruthy();
    expect(order.orderNumber).toMatch(/^AB/);
    expect(order.status).toBe('pending');

    orderId = order.id;
    orderNumber = order.orderNumber;
  });

  // ═══ 2) العميل يستقبل إشعار ═══
  it('Customer receives ORDER_CREATED notification', async () => {
    await new Promise(r => setTimeout(r, 500));

    const res = await api('/notifications?limit=5', customerToken);
    const data: any = await res.json();
    const found = data.items.some((n: any) =>
      n.type === 'ORDER_CREATED' && n.data.orderNumber === orderNumber
    );
    expect(found).toBe(true);
  });

  // ═══ 3) صاحب المتجر يستقبل إشعار ═══
  it('Store owner receives new order notification', async () => {
    const res = await api('/notifications?limit=10', storeToken);
    const data: any = await res.json();
    const found = data.items.some((n: any) =>
      n.type === 'ORDER_CREATED' && n.data.orderNumber === orderNumber
    );
    expect(found).toBe(true);
  });

  // ═══ 4) المتجر يقبل ═══
  it('Store accepts the order', async () => {
    const res = await api(`/store-owner/orders/${orderId}/accept`, storeToken, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const order: any = await res.json();
    expect(order.status).toBe('accepted');
  });

  // ═══ 5) المتجر يحضّر ═══
  it('Store starts preparing', async () => {
    const res = await api(`/store-owner/orders/${orderId}/preparing`, storeToken, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const order: any = await res.json();
    expect(order.status).toBe('preparing');
  });

  // ═══ 6) المتجر يجهّز — Smart Dispatch ═══
  it('Store marks ready — Smart Dispatch fires', async () => {
    const res = await api(`/store-owner/orders/${orderId}/ready`, storeToken, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const order: any = await res.json();
    expect(order.status).toBe('ready');
    await new Promise(r => setTimeout(r, 2000));
  });

  // ═══ 7) المندوب يستقبل عرضًا ═══
  it('Driver receives dispatch notification', async () => {
    const res = await api('/notifications?limit=10', driverToken);
    const data: any = await res.json();
    const found = data.items.some((n: any) =>
      n.type === 'ORDER_READY' &&
      n.data.orderId === orderId &&
      n.data.action === 'available'
    );
    expect(found).toBe(true);
  });

  // ═══ 8) المندوب يقبل ═══
  it('Driver accepts the order', async () => {
    const res = await api(`/driver/orders/${orderId}/accept`, driverToken, { method: 'POST' });
    expect(res.status).toBe(201);
    const order: any = await res.json();
    expect(order.status).toBe('driverAssigned');
  });

  // ═══ 9) الدورة الكاملة للمندوب ═══
  it('Driver completes full delivery cycle', async () => {
    const steps: Array<[string, string]> = [
      ['pickup', 'pickedUp'],
      ['in-transit', 'driverGoingToCustomer'],
      ['arrived', 'driverArrivedCustomer'],
      ['deliver', 'delivered'],
    ];

    for (const [action, expectedStatus] of steps) {
      const res = await api(`/driver/orders/${orderId}/${action}`, driverToken, { method: 'POST' });
      expect(res.status).toBe(201);
      const order: any = await res.json();
      expect(order.status).toBe(expectedStatus);
    }
  });

  // ═══ 10) العميل يستقبل إشعار التسليم ═══
  it('Customer receives DELIVERED notification', async () => {
    await new Promise(r => setTimeout(r, 500));

    const res = await api('/notifications?limit=20', customerToken);
    const data: any = await res.json();

    const expectedTypes = ['ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_READY', 'DRIVER_ASSIGNED', 'ORDER_DELIVERED'];
    for (const type of expectedTypes) {
      const found = data.items.some((n: any) => n.type === type);
      expect(found).toBe(true);
    }
  });

  // ═══ 11) Finance ═══
  it('Commission is computed for the order', async () => {
    const res = await api('/finance/store/commissions?limit=50', storeToken);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    const commission = data.items.find((c: any) => c.orderId === orderId);
    expect(commission).toBeTruthy();
    expect(commission.commissionAmount).toBeGreaterThan(0);
  });

  // ═══ 12) Admin ═══
  it('Admin sees dashboard stats', async () => {
    const res = await api('/admin/dashboard', adminToken);
    expect(res.status).toBe(200);
    const stats: any = await res.json();
    expect(stats.totalOrders).toBeGreaterThan(0);
    expect(stats.totalUsers).toBeGreaterThan(0);
  });
});
