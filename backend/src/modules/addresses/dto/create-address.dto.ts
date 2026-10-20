import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'المنزل', default: 'home', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label?: string;

  @ApiProperty({ example: 'شارع تعز، جوار صيدلية النور', maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  addressLine!: string;

  @ApiPropertyOptional({ example: '12', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  building?: string;

  @ApiPropertyOptional({ example: '3', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  floor?: string;

  @ApiPropertyOptional({ example: '5', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  apartment?: string;

  @ApiPropertyOptional({ example: 'بجوار مسجد الرحمة', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  landmark?: string;

  @ApiProperty({ example: 15.369445, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 44.191006, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ description: 'City UUID' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'District UUID' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Area UUID' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Delivery zone UUID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
