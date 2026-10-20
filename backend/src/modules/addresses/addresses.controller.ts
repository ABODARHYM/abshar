import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { AddressesService, AddressResponse } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

@ApiTags('addresses')
@ApiBearerAuth('access-token')
@Controller('addresses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('addresses.manage_own')
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my addresses' })
  @ApiResponse({ status: 200, type: [AddressResponseDto] })
  list(@CurrentUser() user: AuthUser): Promise<AddressResponse[]> {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my address by id' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressResponse> {
    return this.service.get(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my address' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete my address' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string }> {
    return this.service.remove(user.id, id);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set address as default (removes default from others)' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  setDefault(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressResponse> {
    return this.service.setDefault(user.id, id);
  }
}
