import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectOrderDto {
  @ApiPropertyOptional({ example: 'المنتج غير متوفر حاليًا' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  reason?: string;
}
