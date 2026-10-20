import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { ReferralService } from './referral.service';
import { ApplyReferralDto, ValidateReferralDto } from './referral.dto';

@ApiTags('referral')
@ApiBearerAuth('access-token')
@Controller('referral')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralController {
  constructor(private readonly service: ReferralService) {}

  @Get('my/code')
  @ApiOperation({ summary: 'My referral code (customer)' })
  myCode(@CurrentUser() user: AuthUser) {
    return this.service.getMyCode(user.id);
  }

  @Get('my/stats')
  @ApiOperation({ summary: 'My referral stats' })
  myStats(@CurrentUser() user: AuthUser) {
    return this.service.getMyStats(user.id);
  }

  @Get('my/invites')
  @ApiOperation({ summary: 'List my invites' })
  myInvites(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.service.listMyInvites(user.id, q);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a referral code' })
  validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateReferralDto) {
    return this.service.validate(user.id, dto.code);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply a referral code' })
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyReferralDto) {
    return this.service.apply(user.id, dto.code);
  }
}
