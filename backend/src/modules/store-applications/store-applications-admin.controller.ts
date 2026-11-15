import {
  Body, Controller, Get, Param, ParseUUIDPipe, Post,
  Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { StoreApplicationsService } from './store-applications.service';
import { RejectStoreApplicationDto } from './dto/create-store-application.dto';

@ApiTags('admin-store-applications')
@ApiBearerAuth('access-token')
@Controller('admin/store-applications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminStoreApplicationsController {
  constructor(private readonly service: StoreApplicationsService) {}

  @Get()
  @RequirePermission('stores.manage')
  @ApiOperation({ summary: 'List store applications' })
  list(@Query('status') status?: string) {
    return this.service.listForAdmin(status);
  }

  @Post(':id/approve')
  @RequirePermission('stores.manage')
  @ApiOperation({ summary: 'Approve application and create owner/store atomically' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermission('stores.manage')
  @ApiOperation({ summary: 'Reject a store application' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RejectStoreApplicationDto,
  ) {
    return this.service.reject(id, user.id, dto.reason);
  }
}
