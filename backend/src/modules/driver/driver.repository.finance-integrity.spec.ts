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
      delivery_fee: '20.00',
      total: '120.00',
      driver_id: 'driver-1',
    };
    const events: string[] = [];
    const client = {
      query: jest.fn()
        .mockImplementationOnce(async () => ({ rows: [{ status: 'pickedUp', driver_id: 'driver-1' }], rowCount: 1 }))
        .mockImplementationOnce(async () => { events.push('order-update'); return { rows: [deliveredOrder], rowCount: 1 }; })
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
});
