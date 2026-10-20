import { ApiProperty } from '@nestjs/swagger';

export class StoreResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ nullable: true }) descriptionAr!: string | null;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ nullable: true }) coverUrl!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() addressText!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() isOpen!: boolean;
  @ApiProperty() acceptsOrders!: boolean;
  @ApiProperty() deliveryFee!: number;
  @ApiProperty() minOrderAmount!: number;
  @ApiProperty() avgPrepMinutes!: number;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
}
