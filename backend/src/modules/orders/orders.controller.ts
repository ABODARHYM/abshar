import {
  Body,
  Controller,
  Get,
  Headers,
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
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { Paginated } from '../../common/pagination.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService, OrderResponse } from './orders.service';
import {
  CancellationReason,
  CANCELLATION_REASON_LABELS_AR,
} from './order-state-machine';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

const VALID_REASONS = Object.keys(
  CANCELLATION_REASON_LABELS_AR,
) as CancellationReason[];

class CancelOrderDto {
  @ApiPropertyOptional({
    enum: VALID_REASONS,
    example: 'customer_changed_mind',
    description: 'كود سبب الإلغاء',
  })
  @IsOptional()
  @IsIn(VALID_REASONS)
  reasonCode?: CancellationReason;

  @ApiPropertyOptional({
    example: 'غيّرت رأيي',
    maxLength: 300,
    description: 'ملاحظة اختيارية',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

// ═══════════════════════════════════════════════════════════════
// Controller
// ═══════════════════════════════════════════════════════════════

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @RequirePermission('orders.create')
  @ApiOperation({
    summary: 'Create a new order (customer)',
    description:
      'يدعم Idempotency-Key من الـHeader (أو من الـBody عبر idempotencyKey) لمنع تكرار الطلب عند إعادة الإرسال',
  })
  @ApiResponse({ status: 201, description: 'Order created' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ): Promise<OrderResponse> {
    // الأولوية: Header > Body > تلقائي
    if (idempotencyKeyHeader && !dto.idempotencyKey) {
      dto.idempotencyKey = idempotencyKeyHeader;
    }
    return this.service.create(user.id, dto);
  }

  @Get('my')
  @RequirePermission('orders.read_own')
  @ApiOperation({ summary: 'List my orders (customer)' })
  listMyOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderQueryDto,
  ): Promise<Paginated<OrderResponse>> {
    return this.service.listMyOrders(user.id, query);
  }

  @Get('my/:id')
  @RequirePermission('orders.read_own')
  @ApiOperation({ summary: 'Get my order details (customer)' })
  getMyOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    return this.service.getMyOrder(user.id, id);
  }

  @Patch('my/:id/cancel')
  @RequirePermission('orders.cancel_own')
  @ApiOperation({
    summary: 'Cancel my order (customer)',
    description:
      'يُلغى الطلب بحالة cancelled_by_customer مع تسجيل السبب وactor',
  })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    return this.service.cancel(
      user.id,
      id,
      dto.reasonCode ?? 'customer_changed_mind',
      dto.note ?? null,
    );
  }
}
