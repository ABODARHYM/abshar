import { AdminRepository } from './admin.repository';

describe('AdminRepository dashboard revenue', () => {
  it('keeps platform revenue separated by currency and uses Asia/Aden for today', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            total_users: '10',
            active_users: '9',
            total_stores: '3',
            active_stores: '2',
            total_drivers: '4',
            active_drivers: '3',
            total_orders: '20',
            pending_orders: '2',
            delivered_orders: '15',
            cancelled_orders: '3',
            today_orders: '5',
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { currency: 'SAR', total_revenue: '8.00', today_revenue: '2.00' },
            { currency: 'YER', total_revenue: '2500.00', today_revenue: '500.00' },
          ],
        }),
    };
    const repo = new AdminRepository(db as any);

    const result = await repo.getDashboard();
    const [ordersSql] = db.query.mock.calls[0];
    const [revenueSql] = db.query.mock.calls[1];

    expect(String(ordersSql)).toContain("AT TIME ZONE 'Asia/Aden'");
    expect(String(revenueSql)).toContain('GROUP BY');
    expect(result.total_revenue).toBe('0');
    expect(result.today_revenue).toBe('0');
    expect(result.revenue_by_currency).toEqual([
      { currency: 'SAR', total_revenue: '8.00', today_revenue: '2.00' },
      { currency: 'YER', total_revenue: '2500.00', today_revenue: '500.00' },
    ]);
  });
});
