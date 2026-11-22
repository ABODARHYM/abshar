import { OrdersRepository } from './orders.repository';

describe('OrdersRepository original delivery fee', () => {
  it('persists the original pre-coupon fee separately from the customer delivery fee', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'order-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new OrdersRepository(db as any);

    await repo.create('customer-1', {
      storeId: 'store-1',
      currency: 'YER',
      subtotal: 1000,
      deliveryFee: 0,
      originalDeliveryFee: 120,
      deliveryPricingSnapshot: {
        distanceKm: 4.2, zoneId: 'zone-1', distanceTierId: 'tier-1',
        distanceSource: 'routing_api', pricingVersion: 1, currency: 'YER',
        originalDeliveryFee: 120, customerDeliveryFee: 0,
      },
      discountTotal: 0,
      total: 1000,
      addressSnapshot: {
        addressId: 'address-1',
        addressText: 'Marib',
        latitude: 15.4,
        longitude: 45.3,
        recipientName: 'Customer',
        recipientPhone: '777000000',
      },
      idempotencyKey: 'order-key-1',
      couponId: 'coupon-free-delivery',
      items: [{
        productId: 'product-1',
        productName: 'Product',
        unitPrice: 1000,
        quantity: 1,
        lineTotal: 1000,
      }],
    });

    const [sql, params] = client.query.mock.calls[0];
    expect(String(sql)).toContain('original_delivery_fee');
    expect(params[4]).toBe(0);
    expect(params[5]).toBe(120);
    expect(params[6]).toBe(0);
    expect(params[7]).toBe(1000);
    expect(params[17]).toBe(4.2);
    expect(params[18]).toBe('zone-1');
    expect(params[19]).toBe('tier-1');
    expect(params[20]).toBe('routing_api');
    expect(JSON.parse(String(params[22]))).toMatchObject({
      distanceKm: 4.2, zoneId: 'zone-1', distanceTierId: 'tier-1',
      distanceSource: 'routing_api', pricingVersion: 1,
    });
  });
});
