import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination.dto';

export class ApplyReferralDto {
  @ApiProperty({ example: 'ABS-AB12CD34', description: 'كود الإحالة' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'كود الإحالة يجب أن يكون أحرفاً وأرقاماً وشرطة فقط',
  })
  code!: string;
}

export class ValidateReferralDto {
  @ApiProperty({ example: 'ABS-AB12CD34' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'كود الإحالة يجب أن يكون أحرفاً وأرقاماً وشرطة فقط',
  })
  code!: string;
}

export class ListReferralsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    enum: ['pending', 'completed', 'rewarded', 'expired', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['pending', 'completed', 'rewarded', 'expired', 'cancelled'], {
    message: 'الحالة يجب أن تكون إحدى: pending, completed, rewarded, expired, cancelled',
  })
  status?: string;
}
