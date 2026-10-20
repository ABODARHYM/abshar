import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/** Pagination + Sorting قياسي. لا endpoint قوائم بدون حد أقصى لحجم الصفحة. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: 'اسم الحقل (يُتحقق منه ضد قائمة بيضاء في كل Module)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export function toOffset(q: Pick<PaginationQueryDto, 'page' | 'limit'>): number {
  return (q.page - 1) * q.limit;
}

export function buildPage<T>(items: T[], total: number, q: Pick<PaginationQueryDto, 'page' | 'limit'>): Paginated<T> {
  return {
    items,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}
