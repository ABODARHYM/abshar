import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { PaginationQueryDto } from '../../common/pagination.dto';
import { DriverCashService } from './driver-cash.service';
import { CashAdjustDto, CashSubmitDto } from './dto/cash-submit.dto';
import {
  CashSubmitResponseDto,
  DriverCashSummaryDto,
  DriverCashTransactionDto,
  OutstandingDriverDto,
} from './dto/cash-summary.dto';

@ApiTags('driver-cash')
@ApiBearerAuth('access-token')
@Controller('driver-cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriverCashController {
  constructor(private readonly service: DriverCashService) {}

  // ═══════════════ Driver ═══════════════

  @Get('my/summary')
  @RequirePermission('driver.earnings.read_own')
  @ApiOperation({ summary: 'My cash summary' })
  @ApiResponse({ status: 200, type: DriverCashSummaryDto })
  async mySummary(@CurrentUser() user: AuthUser): Promise<DriverCashSummaryDto> {
    return this.service.getSummary(user.id);
  }

  @Get('my/transactions')
  @RequirePermission('driver.earnings.read_own')
  @ApiOperation({ summary: 'My cash transactions' })
  async myTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listMyTransactions(user.id, query);
  }

  @Post('my/submit')
  @RequirePermission('driver.earnings.read_own')
  @ApiOperation({ summary: 'Submit cash to platform' })
  @ApiResponse({ status: 201, type: CashSubmitResponseDto })
  async submitCash(
    @CurrentUser() user: AuthUser,
    @Body() dto: CashSubmitDto,
  ): Promise<CashSubmitResponseDto> {
    return this.service.submitCash(user.id, dto.amount, dto.note ?? null);
  }

  // ═══════════════ Admin ═══════════════

  @Get('outstanding')
  @RequirePermission('finance.read')
  @ApiOperation({ summary: 'List drivers with outstanding cash (admin)' })
  async outstanding(@Query() query: PaginationQueryDto) {
    return this.service.listOutstandingDrivers(query);
  }

  @Get('drivers/:id/transactions')
  @RequirePermission('finance.read')
  @ApiOperation({ summary: 'Driver transactions (admin)' })
  async driverTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listDriverTransactions(id, query);
  }

  @Post('adjust')
  @RequirePermission('finance.manage')
  @ApiOperation({ summary: 'Manual adjustment (admin)' })
  async adjust(
    @CurrentUser() user: AuthUser,
    @Body() dto: CashAdjustDto,
  ) {
    return this.service.adjust(user.id, dto.driverId, dto.amount, dto.reason);
  }
}
