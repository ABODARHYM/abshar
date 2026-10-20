import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { ListReferralsQueryDto } from './referral.dto';
import { ReferralService } from './referral.service';

@ApiTags('referral-admin')
@ApiBearerAuth('access-token')
@Controller('referral/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralAdminController {
  constructor(private readonly service: ReferralService) {}

  @Get('list')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'List all referrals (admin)' })
  listAll(
    @Query() q: ListReferralsQueryDto,
    @Query('status') status?: string,
  ) {
    return this.service.listAll(q, status);
  }

  @Patch(':id/cancel')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Cancel a referral (admin)' })
  cancel(@Param('id') id: string) {
    return this.service.adminCancel(id);
  }
}
