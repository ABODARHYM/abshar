import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CashSubmitDto {
  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'تسليم نقدي لفرع مأرب' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CashAdjustDto {
  @ApiProperty()
  @IsString()
  driverId!: string;

  @ApiProperty({ example: 1000, description: 'موجب = إضافة، سالب = خصم' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({ example: 'تسوية نزاع على طلب' })
  @IsString()
  @MaxLength(300)
  reason!: string;
}
