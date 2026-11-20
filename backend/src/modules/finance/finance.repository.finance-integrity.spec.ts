import { FinanceRepository } from './finance.repository';

describe('FinanceRepository shared delivery transaction', () => {
  it('uses the supplied transaction client and locks the delivered order for safe retries', async () => {
    const commission = {
      id: 'commission-1',
      store_amount: '90.00',
      platform_amount: '10.00',
      driver_amount: '20.00',
    };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            store_id: 'store-1',
            driver_id: 'driver-1',
            subtotal: '100.00',
            delivery_fee: '20.00',
            discount_total: '0.00',
            total: '120.00',
            currency: 'YER',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [commission], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = { transaction: jest.fn() };
    const repo = new FinanceRepository(db as any);

    const result = await repo.computeCommissionForOrder('order-1', client as any);

    expect(result).toEqual(commission);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    expect(String(client.query.mock.calls[3][0])).not.toContain('ON CONFLICT DO NOTHING');
    expect(String(client.query.mock.calls[5][0])).not.toContain('ON CONFLICT DO NOTHING');
  });
});
