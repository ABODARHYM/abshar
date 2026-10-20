import { ApiProperty } from '@nestjs/swagger';

export class StoreEarningsDto {
  @ApiProperty() todayEarnings!: number;
  @ApiProperty() weekEarnings!: number;
  @ApiProperty() monthEarnings!: number;
  @ApiProperty() totalEarnings!: number;
  @ApiProperty() todayOrders!: number;
  @ApiProperty() weekOrders!: number;
  @ApiProperty() monthOrders!: number;
  @ApiProperty() totalOrders!: number;
  @ApiProperty() pendingSettlement!: number;
  @ApiProperty() lastSettlementAt!: string | null;
}

export class SettlementDto {
  @ApiProperty() id!: string;
  @ApiProperty() partyType!: string;
  @ApiProperty() partyId!: string;
  @ApiProperty({ nullable: true }) partyName!: string | null;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty() grossAmount!: number;
  @ApiProperty() commissionAmount!: number;
  @ApiProperty() netAmount!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty({ nullable: true }) settledAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class CommissionDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty() ratePercent!: number;
  @ApiProperty() orderAmount!: number;
  @ApiProperty() deliveryFee!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() commissionAmount!: number;
  @ApiProperty() storeAmount!: number;
  @ApiProperty() driverAmount!: number;
  @ApiProperty() platformAmount!: number;
  @ApiProperty() createdAt!: string;
}

export class LedgerEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) orderId!: string | null;
  @ApiProperty({ nullable: true }) orderNumber!: string | null;
  @ApiProperty() accountType!: string;
  @ApiProperty({ nullable: true }) accountId!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() direction!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() createdAt!: string;
}
