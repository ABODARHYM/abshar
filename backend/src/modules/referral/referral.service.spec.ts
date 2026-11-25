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
