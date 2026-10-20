import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'MARIB20' })
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,30}$/, {
    message: 'code must be 3-30 uppercase alphanumeric with - _',
  })
  code!: string;

  @ApiProperty({ enum: ['percentage', 'fixed', 'free_delivery'] })
  @IsIn(['percentage', 'fixed', 'free_delivery'])
  type!: 'percentage' | 'fixed' | 'free_delivery';

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
