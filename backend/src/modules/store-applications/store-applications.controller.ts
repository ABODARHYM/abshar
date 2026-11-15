import {
  Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoreApplicationsService } from './store-applications.service';
import {
  CheckStoreApplicationDto,
  CreateStoreApplicationDto,
} from './dto/create-store-application.dto';

@ApiTags('store-applications')
@Controller('store-applications')
export class PublicStoreApplicationsController {
  constructor(private readonly service: StoreApplicationsService) {}

  @Get('options')
  @ApiOperation({ summary: 'Get categories and cities for store application' })
  getOptions() {
    return this.service.getOptions();
  }

  @Get('districts')
  getDistricts(@Query('cityId') cityId: string) {
    return this.service.getDistricts(cityId);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a store owner application' })
  submit(@Body() dto: CreateStoreApplicationDto) {
    return this.service.submit(dto);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Check application status using private tracking token' })
  checkStatus(
    @Param('id') id: string,
    @Body() dto: CheckStoreApplicationDto,
  ) {
    return this.service.checkStatus(id, dto.trackingToken);
  }
}
