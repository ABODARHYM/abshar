import { LoyaltyRepository } from './loyalty.repository';

describe('LoyaltyRepository redeem', () => {
  it('locks reward stock and rejects redemption after the last unit is consumed', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{
          id: 'reward-1',
          name_ar: 'مكافأة',
          points_cost: 100,
          stock: 1,
          used_count: 1,
          is_active: true,
          starts_at: null,
          expires_at: null,
        }],
      }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new LoyaltyRepository(db as any);

    await expect(repo.redeem('customer-1', {
      id: 'reward-1',
      name_ar: 'مكافأة',
      points_cost: 100,
      stock: 1,
      used_count: 0,
      is_active: true,
    } as any, 'YER')).rejects.toThrow('REWARD_OUT_OF_STOCK');

    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects rewards before their start time or after their expiry inside the transaction', async () => {
    const invalidDates = [
      { starts_at: new Date(Date.now() + 60_000), expires_at: null },
      { starts_at: null, expires_at: new Date(Date.now() - 60_000) },
    ];

    for (const dates of invalidDates) {
      const client = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{
            id: 'reward-1',
            name_ar: 'مكافأة',
            points_cost: 100,
            stock: 5,
            used_count: 0,
            is_active: true,
            ...dates,
          }],
        }),
      };
      const db = {
        transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
      };
      const repo = new LoyaltyRepository(db as any);

      await expect(repo.redeem('customer-1', {
        id: 'reward-1', name_ar: 'مكافأة', points_cost: 100,
        stock: 5, used_count: 0, is_active: true,
      } as any, 'YER')).rejects.toThrow('REWARD_UNAVAILABLE');
      expect(client.query).toHaveBeenCalledTimes(1);
    }
  });

  it('uses the locked reward cost and records redemption atomically', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'reward-1',
            name_ar: 'مكافأة',
            points_cost: 120,
            stock: 2,
            used_count: 0,
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ loyalty_points: 300 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'ledger-1' }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new LoyaltyRepository(db as any);

    const result = await repo.redeem('customer-1', {
      id: 'reward-1',
      name_ar: 'مكافأة قديمة',
      points_cost: 80,
      stock: 2,
      used_count: 0,
      is_active: true,
    } as any, 'YER');

    expect(result).toEqual({
      transactionId: 'ledger-1',
      newBalance: 180,
      pointsSpent: 120,
    });
    expect(client.query).toHaveBeenCalledTimes(5);
    expect(client.query.mock.calls[2][1]).toEqual([
      'customer-1', -120, 'reward-1', 'Redeemed: مكافأة',
    ]);
  });
});
