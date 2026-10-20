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
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { FinanceService } from './finance.service';

// ═══════════════ DTOs ═══════════════

class SettlementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['store', 'driver'] })
  @IsOptional()
  @IsIn(['store', 'driver'])
  partyType?: string;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'paid', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'paid', 'cancelled'])
  status?: string;
}

class CommissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class LedgerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['platform', 'store', 'driver', 'customer'] })
  @IsOptional()
  @IsIn(['platform', 'store', 'driver', 'customer'])
  accountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountId?: string;
}

class CreateSettlementDto {
  @ApiProperty({ enum: ['store', 'driver'] })
  @IsIn(['store', 'driver'])
  partyType!: 'store' | 'driver';

  @ApiProperty()
  @IsUUID()
  partyId!: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsISO8601()
  periodStart!: string;

  @ApiProperty({ example: '2026-10-07' })
  @IsISO8601()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════ Controller ═══════════════

@ApiTags('finance')
@ApiBearerAuth('access-token')
@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ═══ Store Owner ═══

  @Get('store/earnings')
  @RequirePermission('store.reports.read_own')
  @ApiOperation({ summary: 'My store earnings (owner)' })
  async getStoreEarnings(@CurrentUser() user: AuthUser) {
    const storeId = await this.service.resolveMyStore(user.id);
    return this.service.getStoreEarnings(storeId);
  }

  @Get('store/commissions')
  @RequirePermission('store.reports.read_own')
  @ApiOperation({ summary: 'My store commissions (owner)' })
  async getStoreCommissions(
    @CurrentUser() user: AuthUser,
    @Query() query: CommissionsQueryDto,
  ) {
    const storeId = await this.service.resolveMyStore(user.id);
    return this.service.listCommissions({
      page: query.page,
      limit: query.limit,
      storeId,
    });
  }

  // ═══ Admin: Settlements ═══

  @Get('settlements')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'List settlements (admin)' })
  listSettlements(@Query() query: SettlementsQueryDto) {
    return this.service.listSettlements(query);
  }

  @Get('settlements/:id')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'Get settlement (admin)' })
  getSettlement(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSettlement(id);
  }

  @Post('settlements')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'Create a new settlement (admin)' })
  createSettlement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.service.createSettlement(user.id, dto);
  }

  @Patch('settlements/:id/approve')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'Approve settlement (admin)' })
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approveSettlement(user.id, id);
  }

  @Patch('settlements/:id/paid')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'Mark settlement as paid (admin)' })
  markPaid(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markSettlementPaid(user.id, id);
  }

  @Patch('settlements/:id/cancel')
  @RequirePermission('settlements.manage')
  @ApiOperation({ summary: 'Cancel settlement (admin)' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelSettlement(user.id, id);
  }

  // ═══ Admin: Commissions ═══

  @Get('commissions')
  @RequirePermission('finance.read')
  @ApiOperation({ summary: 'List all commissions (admin)' })
  listCommissions(@Query() query: CommissionsQueryDto) {
    return this.service.listCommissions(query);
  }

  // ═══ Admin: Ledger ═══

  @Get('ledger')
  @RequirePermission('finance.read')
  @ApiOperation({ summary: 'List ledger entries (admin)' })
  listLedger(@Query() query: LedgerQueryDto) {
    return this.service.listLedger(query);
  }
}
