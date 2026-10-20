import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsObject,
  IsEnum,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationPriority } from './notifications.types';

/** مفاتيح التشفير كما يرسلها المتصفح داخل PushSubscription.toJSON().keys */
export class PushKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

/**
 * يقبل الصيغتين:
 *  1) القياسية من المتصفح: { endpoint, expirationTime, keys: { p256dh, auth } }
 *  2) المسطّحة القديمة:    { endpoint, p256dh, auth }
 */
export class PushSubscribeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  endpoint!: string;

  @ApiPropertyOptional({ type: PushKeysDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys?: PushKeysDto;

  @ApiPropertyOptional()
  @ValidateIf((o: PushSubscribeDto) => o.keys === undefined)
  @IsString()
  @IsNotEmpty()
  p256dh?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: PushSubscribeDto) => o.keys === undefined)
  @IsString()
  @IsNotEmpty()
  auth?: string;

  /** يرسله المتصفح دائمًا (null غالبًا)؛ نقبله ونتجاهله. */
  @ApiPropertyOptional()
  @IsOptional()
  expirationTime?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: ['web', 'android', 'ios'] })
  @IsEnum(['web', 'android', 'ios'])
  platform!: 'web' | 'android' | 'ios';
}

export class SendNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['general', 'order', 'delivery', 'payment', 'loyalty', 'referral', 'promo', 'system', 'chat'])
  category?: NotificationCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: NotificationPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
