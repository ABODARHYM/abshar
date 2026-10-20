import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { Paginated } from '../../common/pagination.dto';
import { DriverOrderQueryDto } from './dto/driver-order-query.dto';
import { DriverLocationDto } from './dto/driver-location.dto';
import { CancelOrderDto } from '../orders/dto/cancel-order.dto';
import {
  DriverEarningsResponseDto,
  DriverOrderResponseDto,
  DriverProfileResponseDto,
} from './dto/driver-response.dto';
import { DriverService } from './driver.service';

class SetAvailabilityDto {
  @ApiProperty({ enum: ['offline', 'online', 'busy'] })
  @IsIn(['offline', 'online', 'busy'])
  availability!: 'offline' | 'online' | 'busy';
}

@ApiTags('driver')
@ApiBearerAuth('access-token')
@Controller('driver')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriverController {
  constructor(private readonly service: DriverService) {}

  // ───── Profile ─────

  @Get('profile')
  @RequirePermission('driver.profile.manage_own')
  @ApiOperation({ summary: 'Get my driver profile' })
  @ApiResponse({ status: 200, type: DriverProfileResponseDto })
  getProfile(@CurrentUser() user: AuthUser): Promise<DriverProfileResponseDto> {
    return this.service.getProfile(user.id);
  }

  @Patch('availability')
  @RequirePermission('driver.profile.manage_own')
  @ApiOperation({ summary: 'Set availability: offline|online|busy' })
  setAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetAvailabilityDto,
  ): Promise<DriverProfileResponseDto> {
    return this.service.setAvailability(user.id, dto.availability);
  }

  @Post('location')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Update my GPS location' })
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: DriverLocationDto,
  ): Promise<{ status: string }> {
    return this.service.updateLocation(user.id, dto.latitude, dto.longitude, dto.orderId);
  }

  // ───── Available Orders ─────

  @Get('orders/available')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'List ready orders waiting for a driver' })
  listAvailable(
    @CurrentUser() user: AuthUser,
    @Query() query: DriverOrderQueryDto,
  ): Promise<Paginated<DriverOrderResponseDto>> {
    return this.service.listAvailableOrders(user.id, query);
  }

  @Get('orders/available/:id')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Get an available order details' })
  getAvailable(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.getAvailableOrder(user.id, id);
  }

  // ───── My Orders ─────

  @Get('orders/my')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'List orders assigned to me (in progress)' })
  listMyOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: DriverOrderQueryDto,
  ): Promise<Paginated<DriverOrderResponseDto>> {
    return this.service.listMyOrders(user.id, query);
  }

  @Get('orders/my/:id')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Get my order details' })
  getMyOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.getMyOrder(user.id, id);
  }

  @Post('orders/:id/accept')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Accept an available (ready) order' })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.acceptOrder(user.id, id);
  }


  @Post('orders/:id/reject')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Reject a Smart Dispatch offer' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string; message: string }> {
    return this.service.rejectOrder(user.id, id);
  }

  @Post('orders/:id/pickup')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Mark order picked up from store' })
  pickup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.pickup(user.id, id);
  }

  @Post('orders/:id/in-transit')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Mark order in transit to customer' })
  inTransit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.inTransit(user.id, id);
  }

  @Post('orders/:id/arrived')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Mark arrived at customer' })
  arrived(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.arrived(user.id, id);
  }

  @Post('orders/:id/deliver')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Mark order delivered' })
  deliver(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverOrderResponseDto> {
    return this.service.deliver(user.id, id);
  }

  @Post('orders/:id/cancel')
  @RequirePermission('driver.tasks.manage_own')
  @ApiOperation({ summary: 'Cancel task (driver)' })
  cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<DriverOrderResponseDto> {
    return this.service.cancelOrder(
      user.id,
      id,
      dto.reasonCode ?? 'driver_unavailable',
      dto.note ?? null,
    );
  }

  // ───── Earnings ─────

  @Get('earnings')
  @RequirePermission('driver.earnings.read_own')
  @ApiOperation({ summary: 'Get my earnings summary' })
  @ApiResponse({ status: 200, type: DriverEarningsResponseDto })
  getEarnings(@CurrentUser() user: AuthUser): Promise<DriverEarningsResponseDto> {
    return this.service.getEarnings(user.id);
  }
}
