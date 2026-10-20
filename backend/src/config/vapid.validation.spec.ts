import { buildConfig } from './configuration';
import { validateEnv } from './env.validation';

const base = {
  NODE_ENV: 'development',
  APP_TIER: 'FREE',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
};
const PUB = 'B' + 'x'.repeat(86);
const PRIV = 'y'.repeat(43);

describe('VAPID env validation', () => {
  it('keeps Web Push disabled when no VAPID keys are set', () => {
    const cfg = buildConfig(validateEnv({ ...base }));
    expect(cfg.push.enabled).toBe(false);
  });

  it('enables Web Push when both keys are valid', () => {
    const cfg = buildConfig(validateEnv({ ...base, VAPID_PUBLIC_KEY: PUB, VAPID_PRIVATE_KEY: PRIV }));
    expect(cfg.push.enabled).toBe(true);
    expect(cfg.push.subject).toBe('mailto:info@absher-bi.com');
  });

  it('rejects a half-configured key pair', () => {
    expect(() => validateEnv({ ...base, VAPID_PUBLIC_KEY: PUB })).toThrow(/must be set together/);
    expect(() => validateEnv({ ...base, VAPID_PRIVATE_KEY: PRIV })).toThrow(/must be set together/);
  });

  it('rejects malformed keys and subjects', () => {
    expect(() => validateEnv({ ...base, VAPID_PUBLIC_KEY: 'bad', VAPID_PRIVATE_KEY: PRIV })).toThrow(/VAPID_PUBLIC_KEY/);
    expect(() =>
      validateEnv({ ...base, VAPID_PUBLIC_KEY: PUB, VAPID_PRIVATE_KEY: PRIV, VAPID_SUBJECT: 'info@x.com' }),
    ).toThrow(/VAPID_SUBJECT/);
  });
});
