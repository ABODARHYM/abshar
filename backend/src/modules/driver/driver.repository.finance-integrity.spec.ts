import { DriverRepository } from './driver.repository';

describe('DriverRepository delivery transaction', () => {
  it('runs delivery finance effects before committing the order transition', async () => {
    const deliveredOrder = {
      id: 'order-1',
      order_number: 'AB-1',
      status: 'delivered',
      payment_method: 'cash_on_delivery',
      currency: 'YER',
      subtotal: '100.00',
      delivery_fee: '0.00',
      original_delivery_fee: '25.00',
      total: '125.00',
      driver_id: 'driver-1',
    };
    const events: string[] = [];
    const client = {
      query: jest.fn()
        .mockImplementationOnce(async () => ({ rows: [{ status: 'pickedUp', driver_id: 'driver-1' }], rowCount: 1 }))
        .mockImplementationOnce(async (sql: string) => { expect(sql).toContain('original_delivery_fee'); events.push('order-update'); return { rows: [deliveredOrder], rowCount: 1 }; })
        .mockImplementationOnce(async () => { events.push('status-history'); return { rows: [], rowCount: 1 }; })
        .mockImplementationOnce(async () => { events.push('driver-release'); return { rows: [], rowCount: 1 }; })
        .mockImplementationOnce(async () => { events.push('assignment-complete'); return { rows: [], rowCount: 1 }; }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new DriverRepository(db as any);
    const onDelivered = jest.fn(async (tx: any, order: any) => {
      expect(tx).toBe(client);
      expect(order).toEqual(deliveredOrder);
      events.push('financial-effects');
    });

    await repo.transitionOrderStatus(
      'order-1',
      'driver-1',
      ['pickedUp'],
      'delivered',
      'delivered',
      undefined,
      onDelivered,
    );

    expect(onDelivered).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      'order-update',
      'status-history',
      'financial-effects',
      'driver-release',
      'assignment-complete',
    ]);
  });
  it('calculates driver earnings from the original fee when customer delivery is free', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({
        rows: [{
          total_earnings: '25.00',
          total_deliveries: '1',
          today_earnings: '25.00',
          today_deliveries: '1',
          week_earnings: '25.00',
          week_deliveries: '1',
          month_earnings: '25.00',
          month_deliveries: '1',
        }],
      }),
    };
    const repo = new DriverRepository(db as any);
    const result = await repo.getEarnings('driver-1');
    const [sql, params] = db.query.mock.calls[0];
    expect(String(sql)).toContain('COALESCE(original_delivery_fee, delivery_fee)');
    expect(params).toEqual(['driver-1']);
    expect(result.total_earnings).toBe('25.00');
    expect(result.total_deliveries).toBe('1');
  });

});
