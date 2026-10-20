import { ApiProperty } from '@nestjs/swagger';

export class DispatchResultDto {
  @ApiProperty() orderId!: string;
  @ApiProperty() roundNumber!: number;
  @ApiProperty() driversOffered!: number;
  @ApiProperty() driversTier!: number;
  @ApiProperty() usesBroadcast!: boolean;
  @ApiProperty() estimatedRadius!: number;
}

export class NearbyDriverDto {
  @ApiProperty() driverId!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() distanceKm!: number;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() availability!: string;
}
