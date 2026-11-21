import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeographyService } from './geography.service';

@ApiTags('geography')
@Controller('geography')
export class GeographyController {
  constructor(private readonly service: GeographyService) {}

  @Get('governorates')
  @ApiOperation({ summary: 'List verified administrative governorates' })
  listGovernorates() { return this.service.listGovernorates(); }

  @Get('governorates/:id/administrative-districts')
  @ApiOperation({ summary: 'List administrative districts in a governorate' })
  listAdministrativeDistricts(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listAdministrativeDistricts(id);
  }

  @Get('cities')
  @ApiOperation({ summary: 'List active delivery cities' })
  listCities() { return this.service.listCities(); }

  @Get('cities/:id')
  @ApiOperation({ summary: 'Get city by id' })
  getCity(@Param('id', ParseUUIDPipe) id: string) { return this.service.getCity(id); }

  @Get('cities/:id/districts')
  @ApiOperation({ summary: 'List delivery localities in a city (legacy-compatible)' })
  listDistricts(@Param('id', ParseUUIDPipe) id: string) { return this.service.listDistricts(id); }

  @Get('districts/:id')
  @ApiOperation({ summary: 'Get delivery locality by id' })
  getDistrict(@Param('id', ParseUUIDPipe) id: string) { return this.service.getDistrict(id); }

  @Get('districts/:id/areas')
  @ApiOperation({ summary: 'List areas in a delivery locality' })
  listAreas(@Param('id', ParseUUIDPipe) id: string) { return this.service.listAreas(id); }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Get area by id' })
  getArea(@Param('id', ParseUUIDPipe) id: string) { return this.service.getArea(id); }

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiOperation({ summary: 'Search delivery cities/localities/areas' })
  search(@Query('q') q: string) { return this.service.search(q || ''); }
}
