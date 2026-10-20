import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) productId!: string | null;
  @ApiProperty({ nullable: true }) variantId!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true }) variantName!: string | null;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotal!: number;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty({ nullable: true }) storeName!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() paymentMethod!: string;
  @ApiProperty() paymentStatus!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() deliveryFee!: number;
  @ApiProperty() discountTotal!: number;
  @ApiProperty() total!: number;
  @ApiProperty() deliveryAddressText!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() recipientPhone!: string;
  @ApiProperty({ nullable: true }) customerNotes!: string | null;
  @ApiProperty({ nullable: true }) placedAt!: string | null;
  @ApiProperty({ nullable: true }) deliveredAt!: string | null;
  @ApiProperty({ nullable: true }) cancelledAt!: string | null;
  @ApiProperty({ nullable: true }) cancelReason!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: [OrderItemResponseDto], required: false })
  items?: OrderItemResponseDto[];
}
