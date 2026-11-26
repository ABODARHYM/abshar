import { OrdersRepository } from './orders.repository';

const payload = {
  storeId: 'store-1',
  currency: 'YER',
  subtotal: 1500,
  deliveryFee: 100,
  originalDeliveryFee: 100,
  deliveryPricingSnapshot: {
    distanceKm: 2, zoneId: 'zone-1', zoneName: 'Zone 1', distanceTierId: 'tier-1',
    distanceTierMinKm: 0, distanceTierMaxKm: 3, distanceTierFee: 100,
    distanceSource: 'routing_api', pricingVersion: 1, currency: 'YER',
    originalDeliveryFee: 100, customerDeliveryFee: 100,
  },
  discountTotal: 50,
  total: 1550,
  addressSnapshot: {
    addressId: 'address-1', addressText: 'Marib', latitude: 15.4, longitude: 45.3,
    recipientName: 'Customer', recipientPhone: '777000000',
  },
  idempotencyKey: 'order-product-coupon-1',
  couponId: 'coupon-1',
  items: [
    { productId: 'product-1', productName: 'Eligible', unitPrice: 500, quantity: 1, lineTotal: 500 },
    { productId: 'product-2', productName: 'Not eligible', unitPrice: 1000, quantity: 1, lineTotal: 1000 },
  ],
};

describe('OrdersRepository product coupon atomicity', () => {
  it('revalidates discount against selected products and records usage in the order transaction', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{
          is_active: true, starts_at: null, expires_at: null, usage_limit: 5,
          per_user_limit: 1, used_count: 0, store_id: null, min_order_amount: 400,
          type: 'percentage', value: 10, max_discount_amount: null, scope: 'products',
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ product_id: 'product-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new OrdersRepository(db as any);

    await repo.create('customer-1', payload);

    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    expect(String(client.query.mock.calls[1][0])).toContain('coupon_products');
    expect(client.query.mock.calls[7][1]).toEqual(['coupon-1', 'customer-1', 'order-1', 50]);
    expect(String(client.query.mock.calls[8][0])).toContain('used_count = used_count + 1');
    expect(client.query).toHaveBeenCalledTimes(9);
  });

  it('rejects stale whole-cart discount when only selected products are eligible', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{
          is_active: true, starts_at: null, expires_at: null, usage_limit: null,
          per_user_limit: null, used_count: 0, store_id: null, min_order_amount: 400,
          type: 'percentage', value: 10, max_discount_amount: null, scope: 'products',
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ product_id: 'product-1' }], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new OrdersRepository(db as any);

    await expect(repo.create('customer-1', {
      ...payload,
      discountTotal: 150,
      total: 1450,
    })).rejects.toThrow('COUPON_TERMS_CHANGED');

    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('rejects a product coupon when the cart has no selected products', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{
          is_active: true, starts_at: null, expires_at: null, usage_limit: null,
          per_user_limit: null, used_count: 0, store_id: null, min_order_amount: 0,
          type: 'fixed', value: 100, max_discount_amount: null, scope: 'products',
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ product_id: 'product-3' }], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new OrdersRepository(db as any);

    await expect(repo.create('customer-1', payload)).rejects.toThrow('COUPON_TERMS_CHANGED');
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
