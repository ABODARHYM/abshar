/**
 * RBAC Matrix Test
 */

const API_BASE = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';

async function login(identifier: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Login ${identifier} failed`);
  const data: any = await res.json();
  return data.tokens.accessToken;
}

async function api(path: string, token: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('RBAC Matrix', () => {
  let customerToken: string;
  let storeToken: string;
  let driverToken: string;
  let adminToken: string;

  beforeAll(async () => {
    customerToken = await login('test@example.com', 'Test12345');
    storeToken = await login('store@example.com', 'Test12345');
    driverToken = await login('driver@example.com', 'Test12345');
    adminToken = await login('admin@example.com', 'Test12345');
  });

  describe('Customer', () => {
    it('CAN access /profile', async () => {
      expect((await api('/profile', customerToken)).status).toBe(200);
    });
    it('CAN access /addresses', async () => {
      expect((await api('/addresses', customerToken)).status).toBe(200);
    });
    it('CAN access /orders/my', async () => {
      expect((await api('/orders/my', customerToken)).status).toBe(200);
    });
    it('CANNOT access /admin/dashboard', async () => {
      expect((await api('/admin/dashboard', customerToken)).status).toBe(403);
    });
    it('CANNOT access /store-owner/my-store', async () => {
      expect((await api('/store-owner/my-store', customerToken)).status).toBe(403);
    });
    it('CANNOT access /driver/profile', async () => {
      expect((await api('/driver/profile', customerToken)).status).toBe(403);
    });
  });

  describe('Store Owner', () => {
    it('CAN access /store-owner/my-store', async () => {
      expect((await api('/store-owner/my-store', storeToken)).status).toBe(200);
    });
    it('CAN access /store-owner/orders', async () => {
      expect((await api('/store-owner/orders', storeToken)).status).toBe(200);
    });
    it('CAN access /store-owner/products', async () => {
      expect((await api('/store-owner/products', storeToken)).status).toBe(200);
    });
    it('CAN access /finance/store/earnings', async () => {
      expect((await api('/finance/store/earnings', storeToken)).status).toBe(200);
    });
    it('CANNOT access /admin/dashboard', async () => {
      expect((await api('/admin/dashboard', storeToken)).status).toBe(403);
    });
    it('CANNOT access /driver/profile', async () => {
      expect((await api('/driver/profile', storeToken)).status).toBe(403);
    });
  });

  describe('Driver', () => {
    it('CAN access /driver/profile', async () => {
      expect((await api('/driver/profile', driverToken)).status).toBe(200);
    });
    it('CAN access /driver/orders/available', async () => {
      expect((await api('/driver/orders/available', driverToken)).status).toBe(200);
    });
    it('CAN access /driver/earnings', async () => {
      expect((await api('/driver/earnings', driverToken)).status).toBe(200);
    });
    it('CANNOT access /admin/dashboard', async () => {
      expect((await api('/admin/dashboard', driverToken)).status).toBe(403);
    });
    it('CANNOT access /store-owner/my-store', async () => {
      expect((await api('/store-owner/my-store', driverToken)).status).toBe(403);
    });
  });

  describe('Admin', () => {
    it('CAN access /admin/dashboard', async () => {
      expect((await api('/admin/dashboard', adminToken)).status).toBe(200);
    });
    it('CAN access /admin/users', async () => {
      expect((await api('/admin/users', adminToken)).status).toBe(200);
    });
    it('CAN access /admin/stores', async () => {
      expect((await api('/admin/stores', adminToken)).status).toBe(200);
    });
    it('CAN access /admin/orders', async () => {
      expect((await api('/admin/orders', adminToken)).status).toBe(200);
    });
    it('CAN access /admin/audit-logs', async () => {
      expect((await api('/admin/audit-logs', adminToken)).status).toBe(200);
    });
    it('CAN access /finance/settlements', async () => {
      expect((await api('/finance/settlements', adminToken)).status).toBe(200);
    });
  });

  describe('No Token', () => {
    it('Public: /health', async () => {
      expect((await fetch(`${API_BASE}/health`)).status).toBe(200);
    });
    it('Public: /stores', async () => {
      expect((await fetch(`${API_BASE}/stores`)).status).toBe(200);
    });
    it('Public: /categories', async () => {
      expect((await fetch(`${API_BASE}/categories`)).status).toBe(200);
    });
    it('Protected: /profile → 401', async () => {
      expect((await fetch(`${API_BASE}/profile`)).status).toBe(401);
    });
    it('Protected: /admin/dashboard → 401', async () => {
      expect((await fetch(`${API_BASE}/admin/dashboard`)).status).toBe(401);
    });
  });
});
