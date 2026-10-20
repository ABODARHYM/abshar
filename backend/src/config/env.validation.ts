import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { AppTier, NodeEnv } from './app-tier';

const PLACEHOLDER = /change-me/i;

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsEnum(AppTier)
  APP_TIER: AppTier = AppTier.Free;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsBoolean()
  SWAGGER_ENABLED: boolean = false;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must start with postgres:// or postgresql://' })
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Max(200)
  DATABASE_POOL_MAX: number = 10;

  @IsBoolean()
  DATABASE_SSL: boolean = false;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(3600)
  JWT_REFRESH_TTL_SECONDS: number = 2592000;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS: number = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;

  @IsOptional()
  @IsString()
  STORAGE_URL?: string;

  @IsOptional()
  @IsString()
  NOTIFICATION_CONFIG?: string;

  // Web Push (VAPID). اختياري: إن غاب الزوج يُعطَّل الـ Push فقط ويبقى WebSocket والإشعارات داخل التطبيق.
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{80,100}$/, { message: 'VAPID_PUBLIC_KEY must be a URL-safe base64 P-256 public key (run: npm run vapid:generate)' })
  VAPID_PUBLIC_KEY?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{40,60}$/, { message: 'VAPID_PRIVATE_KEY must be a URL-safe base64 P-256 private key (run: npm run vapid:generate)' })
  VAPID_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(mailto:|https:\/\/)\S+$/, { message: 'VAPID_SUBJECT must start with mailto: or https://' })
  VAPID_SUBJECT?: string;

  // Redis مطلوب فقط في PRO (Queue / Background Jobs / WebSocket scaling)
  @ValidateIf((o: EnvironmentVariables) => o.APP_TIER === AppTier.Pro)
  @IsString()
  @Matches(/^rediss?:\/\//, { message: 'REDIS_URL is required when APP_TIER=PRO and must start with redis:// or rediss://' })
  REDIS_URL?: string;
}

function parseBoolean(value: unknown, fallback: boolean): boolean | unknown {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return value; // يترك القيمة كما هي ليفشل IsBoolean برسالة واضحة
}

function dropEmpty(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (v !== '' && v !== undefined) out[k] = v;
  }
  return out;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const cleaned = dropEmpty(config);
  cleaned.SWAGGER_ENABLED = parseBoolean(config.SWAGGER_ENABLED, false);
  cleaned.DATABASE_SSL = parseBoolean(config.DATABASE_SSL, false);

  const validated = plainToInstance(EnvironmentVariables, cleaned, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false, whitelist: false });
  if (errors.length > 0) {
    const lines = errors.map((e) => {
      const reasons = Object.values(e.constraints ?? {}).join('; ');
      return ` - ${e.property}: ${reasons}`;
    });
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }

  // زوج VAPID: إما الاثنان معًا أو لا شيء (نصف زوج = إعداد خاطئ يجب أن يُكتشف عند الإقلاع)
  if (Boolean(validated.VAPID_PUBLIC_KEY) !== Boolean(validated.VAPID_PRIVATE_KEY)) {
    throw new Error(
      'Invalid environment configuration:\n - VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set together (or both left empty to disable Web Push)',
    );
  }

  // قواعد إضافية خاصة بـ production/staging: ممنوع تشغيل أسرار افتراضية
  if (validated.NODE_ENV === NodeEnv.Production || validated.NODE_ENV === NodeEnv.Staging) {
    const problems: string[] = [];
    if (PLACEHOLDER.test(validated.JWT_ACCESS_SECRET)) problems.push('JWT_ACCESS_SECRET still has a placeholder value');
    if (PLACEHOLDER.test(validated.JWT_REFRESH_SECRET)) problems.push('JWT_REFRESH_SECRET still has a placeholder value');
    if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    if (PLACEHOLDER.test(validated.DATABASE_URL)) problems.push('DATABASE_URL still has a placeholder password');
    if (validated.CORS_ORIGINS.split(',').some((o) => o.trim() === '*')) problems.push('CORS_ORIGINS must not contain * in production/staging');
    if (problems.length > 0) {
      throw new Error(`Unsafe ${validated.NODE_ENV} configuration:\n${problems.map((p) => ` - ${p}`).join('\n')}`);
    }
  }

  return validated;
}
