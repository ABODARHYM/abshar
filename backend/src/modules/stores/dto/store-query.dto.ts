import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';
import { Transform } from 'class-transformer';

export class StoreQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالاسم' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'فلترة بالتصنيف' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'المتاجر المفتوحة فقط' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  openOnly?: boolean;
}
