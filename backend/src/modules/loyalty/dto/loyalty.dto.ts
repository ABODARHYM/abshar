import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, IsIn } from 'class-validator';

export class LoyaltyBalanceDto {
  @ApiProperty() points!: number;
  @ApiProperty() pendingPoints!: number;
  @ApiProperty() pointValueCurrency!: number;
  @ApiProperty() totalValue!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() lifetimeEarned!: number;
  @ApiProperty() lifetimeRedeemed!: number;
}

export class LoyaltyTransactionDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() points!: number;
  @ApiProperty({ nullable: true }) orderId!: string | null;
  @ApiProperty({ nullable: true }) orderNumber!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) expiresAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class RewardDto {
  @ApiProperty() id!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ nullable: true }) descriptionAr!: string | null;
  @ApiProperty() pointsCost!: number;
  @ApiProperty() rewardType!: string;
  @ApiProperty() rewardValue!: number;
  @ApiProperty({ nullable: true }) imageUrl!: string | null;
  @ApiProperty({ nullable: true }) stock!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiProperty() isActive!: boolean;
}

export class RedeemRewardDto {
  @ApiProperty()
  @IsUUID()
  rewardId!: string;
}

export class RedeemResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty() pointsSpent!: number;
  @ApiProperty() remainingPoints!: number;
  @ApiProperty() reward!: RewardDto;
}

export class AdjustPointsDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 500, description: 'موجب = إضافة، سالب = خصم' })
  @Type(() => Number)
  @IsInt()
  points!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  reason!: string;
}

export class CreateRewardDto {
  @ApiProperty() @IsString() @MaxLength(160) nameAr!: string;
  @ApiProperty() @IsString() @MaxLength(160) nameEn!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionAr?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) pointsCost!: number;
  @ApiProperty({ enum: ['discount_fixed', 'discount_percent', 'free_delivery', 'product'] })
  @IsIn(['discount_fixed', 'discount_percent', 'free_delivery', 'product'])
  rewardType!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) rewardValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
