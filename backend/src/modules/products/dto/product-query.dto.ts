import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() storeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
}
