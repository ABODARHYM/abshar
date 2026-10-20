import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { Paginated } from '../../common/pagination.dto';
import { AdminService } from './admin.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import {
  AssignRoleDto,
  UpdateDriverStatusDto,
  UpdateStoreStatusDto,
  UpdateUserStatusDto,
} from './dto/update-user-status.dto';
import { CancelOrderDto } from '../orders/dto/cancel-order.dto';
import {
  AdminAuditLogDto,
  AdminDashboardDto,
  AdminDriverListItemDto,
  AdminOrderListItemDto,
  AdminRoleDto,
  AdminStoreListItemDto,
  AdminUserDetailDto,
  AdminUserListItemDto,
} from './dto/admin-response.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // ───── Dashboard ─────

  @Get('dashboard')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Admin dashboard statistics' })
  @ApiResponse({ status: 200, type: AdminDashboardDto })
  getDashboard(): Promise<AdminDashboardDto> {
    return this.service.getDashboard();
  }

  // ───── Users ─────

  @Get('users')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'List all users' })
  listUsers(@Query() query: AdminUserQueryDto): Promise<Paginated<AdminUserListItemDto>> {
    return this.service.listUsers(query);
  }

  @Get('users/:id')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Get user details' })
  getUser(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetailDto> {
    return this.service.getUser(id);
  }

  @Patch('users/:id/status')
  @RequirePermission('users.manage')
  @ApiOperation({ summary: 'Update user status' })
  updateUserStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<AdminUserDetailDto> {
    return this.service.updateUserStatus(actor.id, actor.roles, id, dto.status);
  }

  @Post('users/:id/roles')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'Assign a role to user' })
  assignRole(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
  ): Promise<AdminUserDetailDto> {
    return this.service.assignRole(actor.id, actor.roles, id, dto.code);
  }

  @Delete('users/:id/roles/:code')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'Remove a role from user' })
  removeRole(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('code') code: string,
  ): Promise<AdminUserDetailDto> {
    return this.service.removeRole(actor.id, actor.roles, id, code);
  }

  @Get('roles')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'List all roles' })
  listRoles(): Promise<AdminRoleDto[]> {
    return this.service.listRoles();
  }

  // ───── Stores ─────

  @Get('stores')
  @RequirePermission('stores.read')
  @ApiOperation({ summary: 'List all stores' })
  listStores(@Query() query: AdminUserQueryDto): Promise<Paginated<AdminStoreListItemDto>> {
    return this.service.listStores(query);
  }

  @Patch('stores/:id/status')
  @RequirePermission('stores.manage')
  @ApiOperation({ summary: 'Update store status' })
  updateStoreStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreStatusDto,
  ): Promise<{ status: string }> {
    return this.service.updateStoreStatus(actor.id, actor.roles, id, dto.status);
  }

  // ───── Drivers ─────

  @Get('drivers')
  @RequirePermission('drivers.read')
  @ApiOperation({ summary: 'List all drivers' })
  listDrivers(@Query() query: AdminUserQueryDto): Promise<Paginated<AdminDriverListItemDto>> {
    return this.service.listDrivers(query);
  }

  @Patch('drivers/:id/status')
  @RequirePermission('drivers.manage')
  @ApiOperation({ summary: 'Update driver status' })
  updateDriverStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
  ): Promise<{ status: string }> {
    return this.service.updateDriverStatus(actor.id, actor.roles, id, dto.status);
  }

  // ───── Orders ─────

  @Get('orders')
  @RequirePermission('orders.read')
  @ApiOperation({ summary: 'List all orders' })
  listOrders(@Query() query: AdminOrderQueryDto): Promise<Paginated<AdminOrderListItemDto>> {
    return this.service.listOrders(query);
  }

  @Get('orders/:id')
  @RequirePermission('orders.read')
  @ApiOperation({ summary: 'Get order details (admin view)' })
  getOrder(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.service.getOrder(id);
  }

  @Patch('orders/:id/cancel')
  @RequirePermission('orders.manage')
  @ApiOperation({ summary: 'Cancel order (admin)' })
  cancelOrder(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<any> {
    return this.service.cancelOrder(
      actor.id,
      actor.roles,
      id,
      dto.reasonCode ?? 'admin_decision',
      dto.note ?? null,
    );
  }

  // ───── Audit Logs ─────

  @Get('audit-logs')
  @RequirePermission('audit.read')
  @ApiOperation({ summary: 'List audit logs' })
  listAuditLogs(@Query() query: AdminUserQueryDto): Promise<Paginated<AdminAuditLogDto>> {
    return this.service.listAuditLogs(query);
  }
}
