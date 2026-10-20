import { IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['general', 'order', 'delivery', 'payment', 'loyalty', 'referral', 'promo', 'system', 'chat'] })
  @IsOptional()
  @IsIn(['general', 'order', 'delivery', 'payment', 'loyalty', 'referral', 'promo', 'system', 'chat'])
  category?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
