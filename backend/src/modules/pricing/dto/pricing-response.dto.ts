import { ApiProperty } from '@nestjs/swagger';

export class DeliveryQuoteDto {
  @ApiProperty() deliveryFee!: number;
  @ApiProperty() distanceKm!: number;
  @ApiProperty() baseFee!: number;
  @ApiProperty() distanceFee!: number;
  @ApiProperty() fuelSurcharge!: number;
  @ApiProperty() surgeMultiplier!: number;
  @ApiProperty() subtotal!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ nullable: true }) freeDeliveryThreshold!: number | null;
  @ApiProperty() isFreeDelivery!: boolean;
  @ApiProperty({ nullable: true }) source!: string | null;
  @ApiProperty({ nullable: true }) zoneId!: string | null;
  @ApiProperty({ nullable: true }) zoneName!: string | null;
  @ApiProperty() currency!: string;
}

export class ZoneResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() city!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() baseDeliveryFee!: number;
  @ApiProperty() feePerKm!: number;
  @ApiProperty() minOrderAmount!: number;
  @ApiProperty({ nullable: true }) freeDeliveryThreshold!: number | null;
  @ApiProperty() surgeMultiplier!: number;
  @ApiProperty() fuelSurcharge!: number;
  @ApiProperty() isActive!: boolean;
}
