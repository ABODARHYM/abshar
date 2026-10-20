import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class DriverLocationDto {
  @ApiProperty({ example: 15.369445, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90) @Max(90)
  latitude!: number;

  @ApiProperty({ example: 44.191006, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180) @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ description: 'UUID of the current order (optional)' })
  @IsOptional() @IsUUID()
  orderId?: string;
}

export class DriverAvailabilityDto {
  @ApiProperty({ enum: ['offline', 'online', 'busy'] })
  @IsOptional()
  availability?: 'offline' | 'online' | 'busy';
}
