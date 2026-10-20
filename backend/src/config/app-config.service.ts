import { Injectable } from '@nestjs/common';
import { AppConfig, buildConfig } from './configuration';
import { validateEnv } from './env.validation';

/**
 * وصول مُقيَّد الأنواع للإعدادات.
 * يُبنى مرة واحدة عند الإقلاع من process.env؛ أي بيئة ناقصة أو غير آمنة تُسقط التشغيل فورًا.
 * (متغيرات البيئة تُحمَّل خارجيًا: Docker/CI أو node --env-file في التطوير.)
 */
@Injectable()
export class AppConfigService {
  readonly all: AppConfig = buildConfig(validateEnv(process.env as Record<string, unknown>));
}
