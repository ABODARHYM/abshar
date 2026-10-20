import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsIn(['pending', 'active', 'suspended', 'deleted'])
  status?: string;

  @ApiPropertyOptional({ description: 'بحث بالبريد/الهاتف/الاسم' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'فلترة بالدور' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  roleCode?: string;
}
