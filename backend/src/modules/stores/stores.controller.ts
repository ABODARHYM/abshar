import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Paginated } from '../../common/pagination.dto';
import { StoreQueryDto } from './dto/store-query.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { StoresService, StoreResponse } from './stores.service';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'List stores (public, paginated)' })
  @ApiResponse({ status: 200, type: StoreResponseDto, isArray: true })
  list(@Query() query: StoreQueryDto): Promise<Paginated<StoreResponse>> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by id (public)' })
  @ApiResponse({ status: 200, type: StoreResponseDto })
  @ApiResponse({ status: 404 })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<StoreResponse> {
    return this.service.get(id);
  }
}
