import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReferralService } from './referral.service';

describe('ReferralService adminCancel', () => {
  const referral = (status: string) => ({ id: 'referral-1', status } as any);

  it('does not allow cancellation after referral rewards were paid', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(referral('rewarded')), cancel: jest.fn() };
    const service = new ReferralService(repo as any, {} as any, {} as any);
    await expect(service.adminCancel('referral-1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('reports a conflict when the referral state changes before cancellation', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(referral('pending')), cancel: jest.fn().mockResolvedValue(false) };
    const service = new ReferralService(repo as any, {} as any, {} as any);
    await expect(service.adminCancel('referral-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns success only when a pending referral is actually cancelled', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(referral('pending')), cancel: jest.fn().mockResolvedValue(true) };
    const service = new ReferralService(repo as any, {} as any, {} as any);
    await expect(service.adminCancel('referral-1')).resolves.toEqual({ success: true });
  });

  it('keeps the existing already-cancelled response', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(referral('cancelled')), cancel: jest.fn() };
    const service = new ReferralService(repo as any, {} as any, {} as any);
    await expect(service.adminCancel('referral-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.cancel).not.toHaveBeenCalled();
  });
});


describe('ReferralService first delivered order reward', () => {
  const client = {} as any;

  it('does not pay either user when no completed referral can be transitioned', async () => {
    const repo = { rewardOnFirstDeliveredOrder: jest.fn().mockResolvedValue(null) };
    const loyaltyRepo = { addPoints: jest.fn() };
    const service = new ReferralService(repo as any, loyaltyRepo as any, {} as any);

    await expect(service.rewardOnFirstDeliveredOrder(client, 'customer-1', 'order-1', 'driver-1'))
      .resolves.toBe(false);

    expect(loyaltyRepo.addPoints).not.toHaveBeenCalled();
  });

  it('pays 200 points to both users once the completed referral is rewarded', async () => {
    const repo = {
      rewardOnFirstDeliveredOrder: jest.fn().mockResolvedValue({
        referrer_id: 'referrer-1',
        referred_id: 'customer-1',
        code: 'INVITE1',
      }),
    };
    const loyaltyRepo = { addPoints: jest.fn().mockResolvedValue(undefined) };
    const service = new ReferralService(repo as any, loyaltyRepo as any, {} as any);

    await expect(service.rewardOnFirstDeliveredOrder(client, 'customer-1', 'order-1', 'driver-1'))
      .resolves.toBe(true);

    expect(repo.rewardOnFirstDeliveredOrder).toHaveBeenCalledWith(client, 'customer-1', 200);
    expect(loyaltyRepo.addPoints).toHaveBeenCalledTimes(2);
    expect(loyaltyRepo.addPoints).toHaveBeenNthCalledWith(1, client, expect.objectContaining({
      customerId: 'referrer-1', type: 'earn', points: 200, createdBy: 'driver-1',
    }));
    expect(loyaltyRepo.addPoints).toHaveBeenNthCalledWith(2, client, expect.objectContaining({
      customerId: 'customer-1', type: 'earn', points: 200, createdBy: 'driver-1',
    }));
  });
});


describe('ReferralService apply rewards', () => {
  it('pays 100 points to both users and leaves the referral awaiting first delivery', async () => {
    const client = {} as any;
    const repo = {
      findByCode: jest.fn().mockResolvedValue({ user_id: 'referrer-1' }),
      findExistingReferral: jest.fn().mockResolvedValue(null),
      hasUserOrdered: jest.fn().mockResolvedValue(false),
      createReferral: jest.fn().mockResolvedValue({ id: 'referral-1' }),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markRewarded: jest.fn(),
    };
    const loyaltyRepo = { addPoints: jest.fn().mockResolvedValue(undefined) };
    const db = { transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)) };
    const service = new ReferralService(repo as any, loyaltyRepo as any, db as any);

    const result = await service.apply('customer-1', 'invite1');

    expect(loyaltyRepo.addPoints).toHaveBeenCalledTimes(2);
    expect(loyaltyRepo.addPoints).toHaveBeenNthCalledWith(1, client, expect.objectContaining({
      customerId: 'referrer-1', points: 100, type: 'earn',
    }));
    expect(loyaltyRepo.addPoints).toHaveBeenNthCalledWith(2, client, expect.objectContaining({
      customerId: 'customer-1', points: 100, type: 'earn',
    }));
    expect(repo.markCompleted).toHaveBeenCalledWith(client, 'referral-1');
    expect(repo.markRewarded).not.toHaveBeenCalled();
    expect(result.rewardPoints).toBe(100);
  });
});
