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
});
