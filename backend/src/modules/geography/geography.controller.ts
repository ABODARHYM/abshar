import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeographyService } from './geography.service';

@ApiTags('geography')
@Controller('geography')
export class GeographyController {
  constructor(private readonly service: GeographyService) {}

  @Get('cities')
  @ApiOperation({ summary: 'List active cities' })
  listCities() {
    return this.service.listCities();
  }

  @Get('cities/:id')
  @ApiOperation({ summary: 'Get city by id' })
  getCity(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCity(id);
  }

  @Get('cities/:id/districts')
  @ApiOperation({ summary: 'List districts in a city' })
  listDistricts(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listDistricts(id);
  }

  @Get('districts/:id')
  @ApiOperation({ summary: 'Get district by id' })
  getDistrict(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getDistrict(id);
  }

  @Get('districts/:id/areas')
  @ApiOperation({ summary: 'List areas in a district' })
  listAreas(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listAreas(id);
  }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Get area by id' })
  getArea(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getArea(id);
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiOperation({ summary: 'Search cities/districts/areas' })
  search(@Query('q') q: string) {
    return this.service.search(q || '');
  }
}
