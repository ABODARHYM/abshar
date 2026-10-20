import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { buildPage, PaginationQueryDto, toOffset } from './pagination.dto';

describe('PaginationQueryDto', () => {
  it('uses defaults', () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('rejects limit above the maximum (no unbounded lists)', () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: '1000' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects page < 1 and bad sortOrder', () => {
    expect(validateSync(plainToInstance(PaginationQueryDto, { page: '0' })).length).toBeGreaterThan(0);
    expect(validateSync(plainToInstance(PaginationQueryDto, { sortOrder: 'sideways' })).length).toBeGreaterThan(0);
  });

  it('computes offset and page meta', () => {
    expect(toOffset({ page: 3, limit: 20 })).toBe(40);
    const page = buildPage(['a'], 41, { page: 1, limit: 20 });
    expect(page.meta).toEqual({ page: 1, limit: 20, total: 41, totalPages: 3 });
    expect(buildPage([], 0, { page: 1, limit: 20 }).meta.totalPages).toBe(1);
  });
});
