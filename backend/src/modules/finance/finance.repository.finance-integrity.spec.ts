import { FinanceRepository } from './finance.repository';

describe('FinanceRepository shared delivery transaction', () => {
  it('uses the supplied transaction client and locks the delivered order for safe retries', async () => {
    const commission = {
      id: 'commission-1',
      store_id: 'store-1',
      order_amount: '100.00',
      delivery_fee: '20.00',
      original_delivery_fee: '20.00',
      discount_amount: '0.00',
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
            original_delivery_fee: '20.00',
            original_delivery_fee_verified: true,
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
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ is_valid: true, amount: '0.00' }], rowCount: 1 }),
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
  it('selects settlement commissions by Yemen local business dates', async () => {
    const settlement = {
      id: 'settlement-1',
      party_type: 'store',
      party_id: 'store-1',
      period_start: '2026-11-01',
      period_end: '2026-11-07',
      gross_amount: '100.00',
      commission_amount: '10.00',
      net_amount: '90.00',
      currency: 'YER',
      status: 'pending',
      notes: null,
      settled_at: null,
      created_at: new Date('2026-11-08T00:00:00.000Z'),
    };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'commission-1', amount: '90.00', gross_amount: '100.00', commission_amount: '10.00', currency: 'YER' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ gross: '100.00', commission: '10.00', net: '90.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [settlement], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new FinanceRepository(db as any);

    const result = await repo.createSettlement({
      partyType: 'store',
      partyId: 'store-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
      createdBy: 'admin-1',
      actorRole: 'admin',
    });

    expect(result.id).toBe('settlement-1');
    expect(client.query.mock.calls[2][1].slice(4, 7)).toEqual(['100.00', '10.00', '90.00']);
    expect(String(client.query.mock.calls[0][0])).toContain("AT TIME ZONE 'Asia/Aden'");
    expect(String(client.query.mock.calls[0][0])).not.toContain('delivered_at::date');
  });


  it('excludes unverified original delivery fees from driver settlements only', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    };
    const db = { transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)) };
    const repo = new FinanceRepository(db as any);

    const result = await repo.createSettlement({
      partyType: 'driver',
      partyId: 'driver-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
      createdBy: 'admin-1',
      actorRole: 'admin',
    });

    expect(result).toBeNull();
    const sql = String(client.query.mock.calls[0][0]);
    expect(sql).toContain("to_jsonb(o)->>'original_delivery_fee_verified'");
    expect(sql).toContain("$4 <> 'driver'");
    expect(client.query.mock.calls[0][1]).toEqual(['driver-1', '2026-11-01', '2026-11-07', 'driver']);
  });

  it('uses Yemen business dates when calculating unsettled commission totals', async () => {
    const db = { query: jest.fn().mockResolvedValue({
      rows: [{ gross: '90.00', commission: '10.00', net: '90.00', count: '1' }],
    }) };
    const repo = new FinanceRepository(db as any);

    const result = await repo.getUnsettledCommissions('store', 'store-1', '2026-11-01', '2026-11-07');

    expect(result.count).toBe('1');
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("AT TIME ZONE 'Asia/Aden'");
    expect(sql).not.toContain('delivered_at::date');
    expect(db.query.mock.calls[0][1]).toEqual(['store-1', '2026-11-01', '2026-11-07', 'store']);
  });

  it('marks a settlement cancelled before releasing its commission reservations', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'settlement-1',
            party_type: 'store',
            party_id: 'store-1',
            status: 'pending',
            net_amount: '90.00',
            currency: 'YER',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id: 'settlement-1', status: 'cancelled' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new FinanceRepository(db as any);

    const result = await repo.updateSettlementStatus('settlement-1', 'cancelled', 'admin-1', 'admin');

    expect(result.status).toBe('cancelled');
    expect(String(client.query.mock.calls[1][0])).toContain('UPDATE settlements');
    expect(String(client.query.mock.calls[2][0])).toContain('UPDATE settlement_commission_items');
    expect(String(client.query.mock.calls[3][0])).toContain('UPDATE settlement_commissions');
  });

  it('credits the original delivery fee and records platform-funded product and delivery discounts', async () => {
    const commission = {
      id: 'commission-free-delivery',
      store_id: 'store-1',
      order_amount: '100.00',
      delivery_fee: '0.00',
      original_delivery_fee: '20.00',
      discount_amount: '10.00',
      store_amount: '90.00',
      commission_amount: '10.00',
      platform_amount: '10.00',
      driver_amount: '20.00',
    };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{
          id: 'order-2', store_id: 'store-1', driver_id: 'driver-1',
          subtotal: '100.00', delivery_fee: '0.00', original_delivery_fee: '20.00',
          original_delivery_fee_verified: true,
          discount_total: '10.00', total: '90.00', currency: 'YER',
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ commission_rate: '10.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [commission], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ is_valid: true, amount: '20.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const repo = new FinanceRepository({} as any);

    const result = await repo.computeCommissionForOrder('order-2', client as any);

    expect(result).toEqual(commission);
    const commissionInsert = client.query.mock.calls[3];
    expect(String(commissionInsert[0])).toContain('original_delivery_fee');
    expect(String(commissionInsert[0])).toContain('$6::numeric');
    expect(commissionInsert[1][5]).toBe('20.00');

    const productDiscountInsert = client.query.mock.calls[11];
    expect(String(productDiscountInsert[0])).toContain("'discount', 'debit'");
    expect(productDiscountInsert[1]).toEqual([
      'order-2', '10.00', 'YER', 'Platform-funded customer discount',
      'driver-1', 'order:order-2:platform:customer_discount:debit',
    ]);

    expect(String(client.query.mock.calls[12][0])).toContain('GREATEST');
    expect(client.query.mock.calls[12][1]).toEqual(['20.00', '0.00']);
    const freeDeliveryInsert = client.query.mock.calls[14];
    expect(freeDeliveryInsert[1]).toEqual([
      'order-2', '20.00', 'YER', 'Platform-funded free delivery',
      'driver-1', 'order:order-2:platform:free_delivery:debit',
    ]);
  });

  it('refuses to invent a driver fee for historical free-delivery orders with unknown originals', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{
          id: 'legacy-order', store_id: 'store-1', driver_id: 'driver-1',
          subtotal: '100.00', delivery_fee: '0.00', original_delivery_fee: null,
          discount_total: '0.00', total: '100.00', currency: 'YER',
        }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    };
    const repo = new FinanceRepository({} as any);

    await expect(repo.computeCommissionForOrder('legacy-order', client as any))
      .rejects.toThrow('Original delivery fee is unknown');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

});