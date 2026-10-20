import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() timezone!: string;
}

export class DistrictResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() cityId!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ nullable: true }) latitude!: number | null;
  @ApiProperty({ nullable: true }) longitude!: number | null;
}

export class AreaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() districtId!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ nullable: true }) latitude!: number | null;
  @ApiProperty({ nullable: true }) longitude!: number | null;
}
