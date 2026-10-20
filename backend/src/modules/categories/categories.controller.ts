import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService, CategoryResponse } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List platform categories (public)' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  list(): Promise<CategoryResponse[]> {
    return this.service.listPlatform();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id (public)' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404 })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponse> {
    return this.service.get(id);
  }
}
