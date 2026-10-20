import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'أحمد محمد', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+967771234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be 7-15 digits, optionally starting with +',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: ['ar', 'en'], example: 'ar' })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';
}
