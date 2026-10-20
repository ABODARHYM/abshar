import { ApiProperty } from '@nestjs/swagger';

export class CouponResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() type!: string;
  @ApiProperty() value!: number;
  @ApiProperty() minOrderAmount!: number;
  @ApiProperty({ nullable: true }) maxDiscountAmount!: number | null;
  @ApiProperty({ nullable: true }) startsAt!: string | null;
  @ApiProperty({ nullable: true }) expiresAt!: string | null;
  @ApiProperty({ nullable: true }) usageLimit!: number | null;
  @ApiProperty({ nullable: true }) perUserLimit!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiProperty({ nullable: true }) storeId!: string | null;
  @ApiProperty({ nullable: true }) categoryId!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: string;
}

export class CouponValidationDto {
  @ApiProperty() valid!: boolean;
  @ApiProperty({ nullable: true }) couponId!: string | null;
  @ApiProperty({ nullable: true }) code!: string | null;
  @ApiProperty({ nullable: true }) type!: string | null;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() finalSubtotal!: number;
  @ApiProperty({ nullable: true }) message!: string | null;
}
