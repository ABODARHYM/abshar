import { ProfileRepository } from './profile.repository';

describe('ProfileRepository atomic password rotation', () => {
  it('updates the password and revokes all refresh sessions in one transaction', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'user-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new ProfileRepository(db as any);

    const revoked = await repo.changePasswordAndRevokeAllRefreshTokens(
      'user-1',
      'old-hash',
      'new-hash',
    );

    expect(revoked).toBe(3);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(String(client.query.mock.calls[0][0])).toContain('password_hash = $3');
    expect(client.query.mock.calls[0][1]).toEqual(['new-hash', 'user-1', 'old-hash']);
    expect(String(client.query.mock.calls[1][0])).toContain('UPDATE refresh_tokens');
    expect(client.query.mock.calls[1][1]).toEqual(['user-1']);
  });

  it('does not revoke sessions if the password hash changed concurrently', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new ProfileRepository(db as any);

    const result = await repo.changePasswordAndRevokeAllRefreshTokens(
      'user-1',
      'stale-hash',
      'new-hash',
    );

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
