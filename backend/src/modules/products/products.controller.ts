import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Paginated } from '../../common/pagination.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductsService, ProductResponse } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (public, paginated)' })
  @ApiResponse({ status: 200, type: ProductResponseDto, isArray: true })
  list(@Query() query: ProductQueryDto): Promise<Paginated<ProductResponse>> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id (public)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404 })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponse> {
    return this.service.get(id);
  }
}
