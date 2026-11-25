import { ReferralRepository } from './referral.repository';

describe('ReferralRepository cancel', () => {
  it('returns true only when an eligible referral row is updated', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }) };
    const repo = new ReferralRepository(db as any);
    await expect(repo.cancel(null, 'referral-1')).resolves.toBe(true);
    expect(String(db.query.mock.calls[0][0])).toContain("status = 'pending'");
  });

  it('returns false when the referral is no longer cancellable', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };
    const repo = new ReferralRepository(db as any);
    await expect(repo.cancel(null, 'referral-1')).resolves.toBe(false);
  });
});


describe('ReferralRepository first delivered order reward', () => {
  it('updates only a completed referral and adds the bonus to the referrer reward total', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 'referral-1', referrer_id: 'referrer-1', referred_id: 'customer-1', status: 'rewarded', reward_points: 300 }],
      }),
    };
    const repo = new ReferralRepository({} as any);

    await expect(repo.rewardOnFirstDeliveredOrder(client as any, 'customer-1', 200))
      .resolves.toMatchObject({ reward_points: 300 });

    expect(String(client.query.mock.calls[0][0])).toContain("status = 'completed'");
    expect(String(client.query.mock.calls[0][0])).toContain('reward_points = reward_points + $2');
    expect(client.query.mock.calls[0][1]).toEqual(['customer-1', 200]);
  });

  it('returns null on duplicate delivery attempts after the referral was rewarded', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const repo = new ReferralRepository({} as any);

    await expect(repo.rewardOnFirstDeliveredOrder(client as any, 'customer-1', 200))
      .resolves.toBeNull();
  });
});
