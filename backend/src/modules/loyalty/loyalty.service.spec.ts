import { LoyaltyService } from './loyalty.service';
import { PoolClient } from 'pg';

describe('LoyaltyService.earnFromOrderInTransaction', () => {
  it('writes earned points using the caller transaction and preserves order idempotency key', async () => {
    const client = {} as PoolClient;
    const repo = { addPoints: jest.fn().mockResolvedValue(undefined) };
    const service = new LoyaltyService(repo as any);

    await service.earnFromOrderInTransaction(client, 'customer-1', 'order-1', 12500);

    expect(repo.addPoints).toHaveBeenCalledTimes(1);
    expect(repo.addPoints).toHaveBeenCalledWith(client, expect.objectContaining({
      customerId: 'customer-1',
      type: 'earn',
      points: 125,
      orderId: 'order-1',
    }));
  });

  it('does not write a transaction when the calculated reward is zero', async () => {
    const repo = { addPoints: jest.fn() };
    const service = new LoyaltyService(repo as any);

    await service.earnFromOrderInTransaction({} as PoolClient, 'customer-1', 'order-2', 99);

    expect(repo.addPoints).not.toHaveBeenCalled();
  });
  it('propagates reward persistence failures so the enclosing delivery transaction can roll back', async () => {
    const client = {} as PoolClient;
    const repo = { addPoints: jest.fn().mockRejectedValue(new Error('database unavailable')) };
    const service = new LoyaltyService(repo as any);

    await expect(service.earnFromOrderInTransaction(client, 'customer-1', 'order-3', 1000))
      .rejects.toThrow('database unavailable');
    expect(repo.addPoints).toHaveBeenCalledWith(client, expect.any(Object));
  });

});
