import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CancellationReason,
  CANCELLATION_REASON_LABELS_AR,
} from '../order-state-machine';

export const VALID_CANCELLATION_REASONS = Object.keys(
  CANCELLATION_REASON_LABELS_AR,
) as CancellationReason[];

export class CancelOrderDto {
  @ApiPropertyOptional({
    enum: VALID_CANCELLATION_REASONS,
    example: 'customer_changed_mind',
    description: 'كود سبب الإلغاء',
  })
  @IsOptional()
  @IsIn(VALID_CANCELLATION_REASONS)
  reasonCode?: CancellationReason;

  @ApiPropertyOptional({
    example: 'تفاصيل إضافية',
    maxLength: 300,
    description: 'ملاحظة اختيارية',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
