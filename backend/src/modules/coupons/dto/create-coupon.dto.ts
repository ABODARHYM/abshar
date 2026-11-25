import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
export class CreateCouponDto {
  @ApiProperty({ example: 'MARIB20' }) @IsString() @Matches(/^[A-Z0-9_-]{3,30}$/) code!: string;
  @ApiProperty({ enum: ['percentage', 'fixed', 'free_delivery'] }) @IsIn(['percentage', 'fixed', 'free_delivery']) type!: 'percentage' | 'fixed' | 'free_delivery';
  @ApiProperty({ example: 20 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) value!: number;
  @ApiPropertyOptional({ enum: ['general', 'products'], default: 'general' }) @IsOptional() @IsIn(['general', 'products']) scope?: 'general' | 'products';
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('4', { each: true }) productIds?: string[];
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) maxDiscountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() storeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}