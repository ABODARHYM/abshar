import { AppTier, NodeEnv } from './app-tier';
import { EnvironmentVariables } from './env.validation';

/** Free/Pro: القدرات الفعلية التي يقرّرها الـ Backend (لا الواجهة). */
export interface TierFeatures {
  smartDispatch: boolean;
  advancedTracking: boolean;
  redis: boolean;
  backgroundJobs: boolean;
  paymentGateways: boolean;
  wallets: boolean;
  automaticSettlements: boolean;
  multiCity: boolean;
  loyaltyAndReferral: boolean;
}

export const FREE_FEATURES: TierFeatures = Object.freeze({
  smartDispatch: false,
  advancedTracking: false,
  redis: false,
  backgroundJobs: false,
  paymentGateways: false,
  wallets: false,
  automaticSettlements: false,
  multiCity: false,
  loyaltyAndReferral: false,
});

export const PRO_FEATURES: TierFeatures = Object.freeze({
  smartDispatch: true,
  advancedTracking: true,
  redis: true,
  backgroundJobs: true,
  paymentGateways: true,
  wallets: true,
  automaticSettlements: true,
  multiCity: true,
  loyaltyAndReferral: true,
});

export interface AppConfig {
  env: NodeEnv;
  isProduction: boolean;
  port: number;
  swaggerEnabled: boolean;
  tier: AppTier;
  features: TierFeatures;
  database: { url: string; poolMax: number; ssl: boolean };
  jwt: { accessSecret: string; refreshSecret: string; accessTtlSeconds: number; refreshTtlSeconds: number };
  http: { corsOrigins: string[]; throttleTtlSeconds: number; throttleLimit: number };
  providers: { storageUrl?: string; notificationConfig?: string; redisUrl?: string };
  push: { enabled: boolean; publicKey?: string; privateKey?: string; subject: string };
}

export function buildConfig(env: EnvironmentVariables): AppConfig {
  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === NodeEnv.Production,
    port: env.PORT,
    swaggerEnabled: env.SWAGGER_ENABLED,
    tier: env.APP_TIER,
    features: env.APP_TIER === AppTier.Pro ? PRO_FEATURES : FREE_FEATURES,
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX, ssl: env.DATABASE_SSL },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    },
    http: {
      corsOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter((o) => o.length > 0),
      throttleTtlSeconds: env.THROTTLE_TTL_SECONDS,
      throttleLimit: env.THROTTLE_LIMIT,
    },
    providers: {
      storageUrl: env.STORAGE_URL,
      notificationConfig: env.NOTIFICATION_CONFIG,
      redisUrl: env.REDIS_URL,
    },
    push: {
      enabled: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT ?? 'mailto:info@absher-bi.com',
    },
  };
}
