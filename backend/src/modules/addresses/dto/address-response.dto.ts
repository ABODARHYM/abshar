import { ApiProperty } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty() addressLine!: string;
  @ApiProperty({ nullable: true }) building!: string | null;
  @ApiProperty({ nullable: true }) floor!: string | null;
  @ApiProperty({ nullable: true }) apartment!: string | null;
  @ApiProperty({ nullable: true }) landmark!: string | null;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty({ nullable: true }) cityId!: string | null;
  @ApiProperty({ nullable: true }) cityName!: string | null;
  @ApiProperty({ nullable: true }) districtId!: string | null;
  @ApiProperty({ nullable: true }) districtName!: string | null;
  @ApiProperty({ nullable: true }) areaId!: string | null;
  @ApiProperty({ nullable: true }) areaName!: string | null;
  @ApiProperty({ nullable: true }) zoneId!: string | null;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
