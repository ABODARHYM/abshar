import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty({ nullable: true }) categoryId!: string | null;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ nullable: true }) descriptionAr!: string | null;
  @ApiProperty() basePrice!: number;
  @ApiProperty({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() isAvailable!: boolean;
}
