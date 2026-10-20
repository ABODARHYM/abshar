import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { LoyaltyService } from './loyalty.service';
import {
  AdjustPointsDto,
  CreateRewardDto,
  LoyaltyBalanceDto,
  RedeemResponseDto,
  RedeemRewardDto,
  RewardDto,
} from './dto/loyalty.dto';

@ApiTags('loyalty')
@ApiBearerAuth('access-token')
@Controller('loyalty')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('my/balance')
  @ApiOperation({ summary: 'My loyalty balance (customer)' })
  @ApiResponse({ status: 200, type: LoyaltyBalanceDto })
  balance(@CurrentUser() user: AuthUser) {
    return this.service.getBalance(user.id);
  }

  @Get('my/transactions')
  @ApiOperation({ summary: 'My loyalty transactions' })
  myTx(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.service.listMyTransactions(user.id, q);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Available rewards' })
  @ApiResponse({ status: 200, type: [RewardDto] })
  rewards() {
    return this.service.listRewards();
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a reward' })
  @ApiResponse({ status: 201, type: RedeemResponseDto })
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemRewardDto) {
    return this.service.redeem(user.id, dto.rewardId);
  }

  @Post('admin/rewards')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Create reward (admin)' })
  createReward(@CurrentUser() user: AuthUser, @Body() dto: CreateRewardDto) {
    return this.service.createReward(user.id, dto);
  }

  @Post('admin/adjust')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Adjust customer points (admin)' })
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustPointsDto) {
    return this.service.adjust(user.id, dto);
  }
}
