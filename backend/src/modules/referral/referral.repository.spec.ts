import { ReferralRepository } from './referral.repository';

describe('ReferralRepository cancel', () => {
  it('returns true only when an eligible referral row is updated', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }) };
    const repo = new ReferralRepository(db as any);
    await expect(repo.cancel(null, 'referral-1')).resolves.toBe(true);
    expect(String(db.query.mock.calls[0][0])).toContain("status IN ('pending','completed')");
  });

  it('returns false when the referral is no longer cancellable', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };
    const repo = new ReferralRepository(db as any);
    await expect(repo.cancel(null, 'referral-1')).resolves.toBe(false);
  });
});
