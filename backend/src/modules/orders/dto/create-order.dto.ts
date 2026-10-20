import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty() @IsUUID() productId!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() variantId?: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300)
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'UUID للمتجر' })
  @IsUUID() storeId!: string;

  @ApiProperty({ description: 'UUID لعنوان التسليم' })
  @IsUUID() addressId!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'مفتاح فريد لمنع تكرار الطلب (UUID أو نص عشوائي)',
    maxLength: 80,
  })
  @IsOptional() @IsString() @MinLength(8) @MaxLength(80)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'كود كوبون الخصم',
    example: 'MARIB20',
    maxLength: 30,
  })
  @IsOptional() @IsString() @MaxLength(30)
  couponCode?: string;
}
