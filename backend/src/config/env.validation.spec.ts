import { AppTier, NodeEnv } from './app-tier';
import { buildConfig } from './configuration';
import { validateEnv } from './env.validation';

const base = {
  NODE_ENV: 'development',
  APP_TIER: 'FREE',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
};

describe('validateEnv', () => {
  it('accepts a minimal valid FREE configuration and applies defaults', () => {
    const env = validateEnv({ ...base });
    expect(env.APP_TIER).toBe(AppTier.Free);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('converts numeric and boolean strings', () => {
    const env = validateEnv({ ...base, PORT: '4000', SWAGGER_ENABLED: 'true', DATABASE_SSL: '1' });
    expect(env.PORT).toBe(4000);
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.DATABASE_SSL).toBe(true);
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejects short JWT secrets', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects an unknown APP_TIER', () => {
    expect(() => validateEnv({ ...base, APP_TIER: 'GOLD' })).toThrow(/APP_TIER/);
  });

  it('requires REDIS_URL when APP_TIER=PRO', () => {
    expect(() => validateEnv({ ...base, APP_TIER: 'PRO' })).toThrow(/REDIS_URL/);
    const env = validateEnv({ ...base, APP_TIER: 'PRO', REDIS_URL: 'redis://localhost:6379' });
    expect(env.APP_TIER).toBe(AppTier.Pro);
  });

  it('does not require REDIS_URL in FREE even if it is an empty string', () => {
    expect(() => validateEnv({ ...base, REDIS_URL: '' })).not.toThrow();
  });

  it('blocks placeholder secrets in production', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'change-me-access-secret-change-me-access' }),
    ).toThrow(/placeholder/);
  });

  it('blocks identical JWT secrets and wildcard CORS in production', () => {
    const same = 'x'.repeat(40);
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: same, JWT_REFRESH_SECRET: same }),
    ).toThrow(/must differ/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
  });
});

describe('buildConfig', () => {
  it('derives tier features in the backend, not in the client', () => {
    const free = buildConfig(validateEnv({ ...base }));
    expect(free.features.smartDispatch).toBe(false);
    expect(free.features.wallets).toBe(false);

    const pro = buildConfig(validateEnv({ ...base, APP_TIER: 'PRO', REDIS_URL: 'redis://r:6379' }));
    expect(pro.features.smartDispatch).toBe(true);
    expect(pro.features.wallets).toBe(true);
    expect(pro.env).toBe(NodeEnv.Development);
  });

  it('parses CORS origins into a trimmed list', () => {
    const cfg = buildConfig(validateEnv({ ...base, CORS_ORIGINS: ' http://a.com , http://b.com ,' }));
    expect(cfg.http.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
  });
});
