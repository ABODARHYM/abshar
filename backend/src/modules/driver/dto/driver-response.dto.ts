import { ApiProperty } from '@nestjs/swagger';

export class DriverProfileResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) vehicleType!: string | null;
  @ApiProperty({ nullable: true }) vehiclePlate!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() availability!: string;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty({ nullable: true }) lastLatitude!: number | null;
  @ApiProperty({ nullable: true }) lastLongitude!: number | null;
  @ApiProperty({ nullable: true }) lastLocationAt!: string | null;
}

export class DriverOrderItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true }) variantName!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() lineTotal!: number;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

export class DriverOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty({ nullable: true }) storeName!: string | null;
  @ApiProperty() storeAddressText!: string;
  @ApiProperty() storeLatitude!: number;
  @ApiProperty() storeLongitude!: number;
  @ApiProperty({ nullable: true }) storePhone!: string | null;
  @ApiProperty() customerId!: string;
  @ApiProperty({ nullable: true }) customerName!: string | null;
  @ApiProperty() recipientName!: string;
  @ApiProperty() recipientPhone!: string;
  @ApiProperty() deliveryAddressText!: string;
  @ApiProperty() deliveryLatitude!: number;
  @ApiProperty() deliveryLongitude!: number;
  @ApiProperty() paymentMethod!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() deliveryFee!: number;
  @ApiProperty() total!: number;
  @ApiProperty() driverEarning!: number;
  @ApiProperty({ nullable: true }) customerNotes!: string | null;
  @ApiProperty({ nullable: true }) placedAt!: string | null;
  @ApiProperty({ nullable: true }) acceptedAt!: string | null;
  @ApiProperty({ nullable: true }) readyAt!: string | null;
  @ApiProperty({ nullable: true }) pickedUpAt!: string | null;
  @ApiProperty({ nullable: true }) deliveredAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: [DriverOrderItemDto], required: false })
  items?: DriverOrderItemDto[];
}

export class DriverEarningsResponseDto {
  @ApiProperty() totalEarnings!: number;
  @ApiProperty() totalDeliveries!: number;
  @ApiProperty() todayEarnings!: number;
  @ApiProperty() todayDeliveries!: number;
  @ApiProperty() weekEarnings!: number;
  @ApiProperty() weekDeliveries!: number;
  @ApiProperty() monthEarnings!: number;
  @ApiProperty() monthDeliveries!: number;
}
