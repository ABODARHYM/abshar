import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) storeId!: string | null;
  @ApiProperty({ nullable: true }) parentId!: string | null;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() sortOrder!: number;
}
