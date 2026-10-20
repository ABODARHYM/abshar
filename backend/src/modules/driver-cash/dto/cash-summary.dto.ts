import { ApiProperty } from '@nestjs/swagger';

export class DriverCashSummaryDto {
  @ApiProperty() totalCollected!: number;
  @ApiProperty() totalSubmitted!: number;
  @ApiProperty() outstandingCash!: number;
  @ApiProperty() totalEarnings!: number;
  @ApiProperty() netOwed!: number;
  @ApiProperty() currency!: string;
}

export class DriverCashTransactionDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() direction!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) orderId!: string | null;
  @ApiProperty({ nullable: true }) orderNumber!: string | null;
  @ApiProperty({ nullable: true }) settlementId!: string | null;
  @ApiProperty() createdAt!: string;
}

export class CashSubmitResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty() submittedAmount!: number;
  @ApiProperty() newOutstanding!: number;
  @ApiProperty() transactionId!: string;
}

export class OutstandingDriverDto {
  @ApiProperty() driverId!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() outstandingCash!: number;
  @ApiProperty() totalEarnings!: number;
  @ApiProperty() lastCollectionAt!: string | null;
  @ApiProperty() currency!: string;
}
