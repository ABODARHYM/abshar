import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { ListNotificationsQueryDto } from './notifications-query.dto';
import { NotificationsService } from './notifications.service';
import { PushSubscribeDto, RegisterDeviceDto } from './notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() q: ListNotificationsQueryDto,
  ) {
    return this.service.listMine(user.id, q as any);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread count' })
  unread(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one as read' })
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }

  @Get('push/public-key')
  @ApiOperation({ summary: 'Get VAPID public key' })
  pushKey() {
    return this.service.pushPublicKey();
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe to web push' })
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscribeDto) {
    return this.service.subscribePush(user.id, dto);
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from web push' })
  unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body() body: { endpoint: string },
  ) {
    return this.service.unsubscribePush(user.id, body.endpoint);
  }

  @Post('device/register')
  @ApiOperation({ summary: 'Register device token' })
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(user.id, dto.token, dto.platform);
  }
}
