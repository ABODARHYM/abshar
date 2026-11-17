import { DriverCashRepository } from './driver-cash.repository';

describe('DriverCashRepository finance integrity', () => {
  const makeDb = () => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  });

  it('writes COD collection and cash balance through the supplied transaction client', async () => {
    const db = makeDb();
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    const repo = new DriverCashRepository(db as any);

    await repo.recordCashCollection(client as any, {
      driverId: 'driver-1',
      orderId: 'order-1',
      amount: 1250,
      currency: 'YER',
    });

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(db.query).not.toHaveBeenCalled();
    expect(String(client.query.mock.calls[0][0])).toContain('ON CONFLICT DO NOTHING');
    expect(String(client.query.mock.calls[1][0])).toContain('UPDATE orders');
  });

  it('records a new manual cash submission atomically as cash_remittance', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ user_id: 'driver-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ outstanding: '1000.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1' }], rowCount: 1 }),
    };
    const db = {
      query: jest.fn(),
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new DriverCashRepository(db as any);

    const result = await repo.submitCash('driver-1', 500, 'handover', 'YER');

    expect(result).toEqual({ transactionId: 'tx-1' });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledTimes(3);
    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    const sql = String(client.query.mock.calls[2][0]);
    expect(sql).toContain("'cash_remittance'");
    expect(sql).toContain('created_by');
    expect(sql).not.toContain("'settlement_payout'");
  });

  it('rejects a cash handover above the balance while holding the driver lock', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ user_id: 'driver-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ outstanding: '100.00' }], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new DriverCashRepository(db as any);

    await expect(repo.submitCash('driver-1', 101, 'handover', 'YER')).rejects.toThrow();
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('keeps legacy manual remittances in submitted and outstanding totals', async () => {
    const db = makeDb();
    const repo = new DriverCashRepository(db as any);

    await repo.getSummary('driver-1');
    await repo.listOutstandingDrivers({ page: 1, limit: 10 });

    const summarySql = String(db.query.mock.calls[0][0]);
    const outstandingSql = String(db.query.mock.calls[2][0]);
    expect(summarySql).toContain("type = 'cash_remittance'");
    expect(summarySql).toContain("type = 'settlement_payout' AND settlement_id IS NULL");
    expect(outstandingSql).toContain("type = 'cash_remittance'");
    expect(outstandingSql).toContain("type = 'settlement_payout' AND t.settlement_id IS NULL");
  });
});
