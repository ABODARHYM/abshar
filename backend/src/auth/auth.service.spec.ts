jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService refresh-token lifecycle', () => {
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    phone: null,
    full_name: 'Test User',
    status: 'active',
    roles: ['customer'],
    permissions: [],
  };

  let db: any;
  let client: any;
  let service: AuthService;

  const activeToken = (overrides: Record<string, unknown> = {}) => ({
    id: 'token-old',
    user_id: 'user-1',
    family_id: 'family-1',
    expires_at: new Date(Date.now() + 60_000),
    revoked_at: null,
    replaced_by: null,
    ...overrides,
  });

  beforeEach(() => {
    client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<unknown>) => work(client)),
      query: jest.fn().mockResolvedValue({ rows: [user] }),
    };
    const config = {
      all: { jwt: { accessTtlSeconds: 900, refreshTtlSeconds: 86400, accessSecret: 'test-secret' } },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('new-access-token') };
    service = new AuthService(db, config as any, jwt as any);
  });

  it('rejects an expired refresh token without issuing a replacement', async () => {
    client.query.mockResolvedValueOnce({
      rows: [activeToken({ expires_at: new Date(Date.now() - 1) })],
    });

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('commits family revocation before rejecting reuse of a rotated token', async () => {
    let transactionCommitted = false;
    db.transaction.mockImplementation(async (work: (tx: any) => Promise<unknown>) => {
      const result = await work(client);
      transactionCommitted = true;
      return result;
    });
    client.query.mockResolvedValueOnce({
      rows: [activeToken({ revoked_at: new Date(), replaced_by: 'token-new' })],
    });

    await expect(service.refresh('reused-token')).rejects.toThrow('Refresh token reuse detected');

    expect(transactionCommitted).toBe(true);
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(String(client.query.mock.calls[1][0])).toContain('WHERE family_id = $1');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rotates an active token, stores its replacement, and returns a fresh access token', async () => {
    client.query.mockResolvedValueOnce({ rows: [activeToken()] });

    const result = await service.refresh('valid-refresh-token', { userAgent: 'jest', ipAddress: '127.0.0.1' });

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    expect(String(client.query.mock.calls[1][0])).toContain('INSERT INTO refresh_tokens');
    expect(String(client.query.mock.calls[2][0])).toContain('replaced_by = $1');
    expect(result.user.id).toBe('user-1');
    expect(result.tokens.accessToken).toBe('new-access-token');
    expect(result.tokens.refreshToken).not.toBe('valid-refresh-token');
    expect(result.tokens.expiresIn).toBe(900);
  });

  it('revokes the supplied refresh token on logout without exposing its raw value to SQL', async () => {
    await service.logout('logout-refresh-token');

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(String(db.query.mock.calls[0][0])).toContain('WHERE token_hash = $1');
    expect(db.query.mock.calls[0][1][0]).not.toBe('logout-refresh-token');
  });
});

describe('AuthService login lockout concurrency', () => {
  let db: any;
  let service: AuthService;

  beforeEach(() => {
    db = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      transaction: jest.fn(),
    };
    const config = {
      all: { jwt: { accessTtlSeconds: 900, refreshTtlSeconds: 86400, accessSecret: 'test-secret' } },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('new-access-token') };
    service = new AuthService(db, config as any, jwt as any);
  });

  it('increments failed attempts atomically in SQL instead of using a stale count', async () => {
    await (service as any).recordFailedLogin('user-1');

    expect(db.query).toHaveBeenCalledTimes(1);
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain('failed_login_attempts + 1 >= 5');
    expect(sql).toContain('ELSE failed_login_attempts + 1');
    expect(sql).toContain("now() + interval '15 minutes'");
    expect(db.query.mock.calls[0][1]).toEqual(['user-1']);
  });

  it('does not clear a lock applied while a correct password was being checked', async () => {
    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          phone: null,
          password_hash: 'stored-hash',
          full_name: 'Test User',
          status: 'active',
          failed_login_attempts: 4,
          locked_until: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    try {
      await expect(service.login({
        identifier: 'test@example.com',
        password: 'correct-password',
      } as any)).rejects.toThrow('Account is temporarily locked');

      const updateSql = String(db.query.mock.calls[1][0]);
      expect(updateSql).toContain("locked_until <= now()");
      expect(updateSql).toContain("status = 'active'");
      expect(updateSql).toContain('RETURNING id');
      expect(db.query).toHaveBeenCalledTimes(2);
    } finally {
      compare.mockRestore();
    }
  });
});
