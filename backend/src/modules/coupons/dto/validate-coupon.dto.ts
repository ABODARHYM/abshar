import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
export class CouponCartItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty({ minimum: 1, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity!: number;
}
export class ValidateCouponDto {
  @ApiProperty({ example: 'MARIB20' }) @IsString() code!: string;
  @ApiProperty({ example: 5000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) subtotal!: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() storeId?: string;
  @ApiPropertyOptional({ type: [CouponCartItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CouponCartItemDto) items?: CouponCartItemDto[];
}