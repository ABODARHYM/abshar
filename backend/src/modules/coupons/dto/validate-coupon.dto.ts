import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'MARIB20' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
