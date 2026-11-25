import { StoreOwnerRepository } from './store-owner.repository';

describe('StoreOwnerRepository dashboard revenue', () => {
  it('keeps delivered revenue separated by currency instead of summing unlike amounts', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            total_orders: '2',
            pending_orders: '0',
            accepted_orders: '0',
            preparing_orders: '0',
            ready_orders: '0',
            delivered_orders: '2',
            cancelled_orders: '0',
            total_products: '3',
            available_products: '2',
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { currency: 'SAR', total_revenue: '8.00' },
            { currency: 'YER', total_revenue: '2500.00' },
          ],
        }),
    };
    const repo = new StoreOwnerRepository(db as any);

    const result = await repo.getStats('store-1');
    const [revenueSql, revenueParams] = db.query.mock.calls[1];

    expect(revenueParams).toEqual(['store-1']);
    expect(String(revenueSql)).toContain('GROUP BY');
    expect(result.revenue_by_currency).toEqual([
      { currency: 'SAR', total_revenue: '8.00' },
      { currency: 'YER', total_revenue: '2500.00' },
    ]);
    expect(result.total_revenue).toBe(0);
    expect(result.delivered_orders).toBe(2);
  });
});
