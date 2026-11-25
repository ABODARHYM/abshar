import { FinanceRepository } from './finance.repository';

describe('FinanceRepository currency-separated store earnings', () => {
  it('returns separate earnings and pending settlements per currency using Yemen-local periods', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            currency: 'SAR',
            today_earnings: '8.00',
            week_earnings: '8.00',
            month_earnings: '8.00',
            total_earnings: '8.00',
            today_orders: '1',
            week_orders: '1',
            month_orders: '1',
            total_orders: '1',
            pending_settlement: '0.00',
            last_settlement_at: null,
          },
          {
            currency: 'YER',
            today_earnings: '2500.00',
            week_earnings: '2500.00',
            month_earnings: '2500.00',
            total_earnings: '2500.00',
            today_orders: '1',
            week_orders: '1',
            month_orders: '1',
            total_orders: '1',
            pending_settlement: '500.00',
            last_settlement_at: null,
          },
        ],
      }),
    };
    const repo = new FinanceRepository(db as any);

    const result = await repo.getStoreEarnings('store-1');
    const [sql, params] = db.query.mock.calls[0];

    expect(params).toEqual(['store-1']);
    expect(String(sql)).toContain("AT TIME ZONE 'Asia/Aden'");
    expect(String(sql)).toContain('GROUP BY');
    expect(String(sql)).toContain('s.currency');
    expect(result.currency_breakdown).toHaveLength(2);
    expect(result.currency_breakdown.map((row) => row.currency)).toEqual(['SAR', 'YER']);
    expect(result.currency_breakdown[0].total_earnings).toBe('8.00');
    expect(result.currency_breakdown[1].total_earnings).toBe('2500.00');
    expect(result.currency_breakdown[1].pending_settlement).toBe('500.00');
  });
  it('includes the source order currency in commission list records', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'commission-1',
            order_id: 'order-1',
            order_number: 'AB-1',
            store_id: 'store-1',
            store_name: 'Test Store',
            rate_percent: '10',
            order_amount: '100',
            delivery_fee: '0',
            original_delivery_fee: '20',
            discount_amount: '20',
            commission_amount: '10',
            store_amount: '90',
            driver_amount: '20',
            platform_amount: '10',
            currency: 'SAR',
            created_at: new Date('2026-11-25T00:00:00.000Z'),
          }],
        }),
    };
    const repo = new FinanceRepository(db as any);
    const result = await repo.listCommissions({ page: 1, limit: 10 });
    const [sql] = db.query.mock.calls[1];

    expect(String(sql)).toContain('o.currency');
    expect(result.rows[0].currency).toBe('SAR');
    expect(result.total).toBe(1);
  });

});
