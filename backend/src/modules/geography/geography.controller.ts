import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeographyService } from './geography.service';

@ApiTags('geography')
@Controller('geography')
export class GeographyController {
  constructor(private readonly service: GeographyService) {}

  @Get('governorates')
  @ApiOperation({ summary: 'List active administrative governorates with complete source provenance' })
  listGovernorates() { return this.service.listGovernorates(); }

  @Get('governorates/:id/administrative-districts')
  @ApiOperation({ summary: 'List active, sourced administrative districts in a verified governorate' })
  listAdministrativeDistricts(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listAdministrativeDistricts(id);
  }

  @Get('cities')
  @ApiOperation({ summary: 'List selectable cities linked to an active, sourced governorate' })
  listCities() { return this.service.listCities(); }

  @Get('cities/:id')
  @ApiOperation({ summary: 'Get a selectable city linked to an active, sourced governorate' })
  getCity(@Param('id', ParseUUIDPipe) id: string) { return this.service.getCity(id); }

  @Get('cities/:id/districts')
  @ApiOperation({ summary: 'List verified delivery localities in a selectable city' })
  listDistricts(@Param('id', ParseUUIDPipe) id: string) { return this.service.listDistricts(id); }

  @Get('districts/:id')
  @ApiOperation({ summary: 'Get a verified delivery locality in a selectable city' })
  getDistrict(@Param('id', ParseUUIDPipe) id: string) { return this.service.getDistrict(id); }

  @Get('districts/:id/areas')
  @ApiOperation({ summary: 'List verified areas in a verified delivery locality' })
  listAreas(@Param('id', ParseUUIDPipe) id: string) { return this.service.listAreas(id); }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Get a verified area in a verified delivery locality' })
  getArea(@Param('id', ParseUUIDPipe) id: string) { return this.service.getArea(id); }

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiOperation({ summary: 'Search only verified, selectable cities and delivery localities' })
  search(@Query('q') q: string) { return this.service.search(q || ''); }
}
