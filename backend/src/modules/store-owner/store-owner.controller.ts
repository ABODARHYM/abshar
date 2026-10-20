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
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { Paginated, PaginationQueryDto } from '../../common/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StoreOrderQueryDto } from './dto/store-order-query.dto';
import { RejectOrderDto } from './dto/store-order-action.dto';
import { CancelOrderDto } from '../orders/dto/cancel-order.dto';
import {
  CategoryResponse,
  MyStoreResponse,
  ProductResponse,
  StatsResponse,
  StoreOrderResponse,
  StoreOwnerService,
} from './store-owner.service';

// ═══════════════════ DTOs للأفعال ═══════════════════

class UpdateMyStoreDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  nameAr?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  nameEn?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  descriptionAr?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  descriptionEn?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  addressText?: string;

  @ApiPropertyOptional() @IsOptional()
  isOpen?: boolean;

  @ApiPropertyOptional() @IsOptional()
  acceptsOrders?: boolean;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
  minOrderAmount?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
  deliveryFee?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600)
  avgPrepMinutes?: number;
}

class CreateCategoryDto {
  @ApiProperty({ example: 'وجبات رئيسية' })
  @IsString() @MinLength(2) @MaxLength(120)
  nameAr!: string;

  @ApiProperty({ example: 'Main Dishes' })
  @IsString() @MinLength(2) @MaxLength(120)
  nameEn!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  sortOrder?: number;
}

class StoreProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  categoryId?: string;
}

// ═══════════════════ Controller ═══════════════════

@ApiTags('store-owner')
@ApiBearerAuth('access-token')
@Controller('store-owner')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreOwnerController {
  constructor(private readonly service: StoreOwnerService) {}

  // ───── المتجر ─────

  @Get('my-store')
  @RequirePermission('store.profile.manage_own')
  @ApiOperation({ summary: 'Get my store details' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 403, description: 'You do not own a store' })
  getMyStore(@CurrentUser() user: AuthUser): Promise<MyStoreResponse> {
    return this.service.getMyStore(user.id);
  }

  @Patch('my-store')
  @RequirePermission('store.profile.manage_own')
  @ApiOperation({ summary: 'Update my store' })
  @ApiResponse({ status: 200, description: 'Updated store' })
  updateMyStore(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMyStoreDto,
  ): Promise<MyStoreResponse> {
    return this.service.updateMyStore(user.id, dto);
  }

  // ───── التصنيفات ─────

  @Get('categories')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'List my categories' })
  listCategories(@CurrentUser() user: AuthUser): Promise<CategoryResponse[]> {
    return this.service.listCategories(user.id);
  }

  @Post('categories')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'Create a category' })
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.service.createCategory(user.id, dto);
  }

  // ───── المنتجات ─────

  @Get('products')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'List my products (paginated)' })
  listProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: StoreProductsQueryDto,
  ): Promise<Paginated<ProductResponse>> {
    return this.service.listProducts(user.id, query);
  }

  @Get('products/:id')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'Get a product' })
  getProduct(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponse> {
    return this.service.getProduct(user.id, id);
  }

  @Post('products')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'Create a product' })
  createProduct(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponse> {
    return this.service.createProduct(user.id, dto);
  }

  @Patch('products/:id')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'Update a product' })
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.service.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  @RequirePermission('store.products.manage_own')
  @ApiOperation({ summary: 'Delete a product (soft)' })
  deleteProduct(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string }> {
    return this.service.deleteProduct(user.id, id);
  }

  // ───── الطلبات ─────

  @Get('orders')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'List my store orders (paginated)' })
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: StoreOrderQueryDto,
  ): Promise<Paginated<StoreOrderResponse>> {
    return this.service.listOrders(user.id, query);
  }

  @Get('orders/:id')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Get an order details' })
  getOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoreOrderResponse> {
    return this.service.getOrder(user.id, id);
  }

  @Patch('orders/:id/accept')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Accept a pending order' })
  acceptOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoreOrderResponse> {
    return this.service.acceptOrder(user.id, id);
  }

  @Patch('orders/:id/reject')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Reject a pending order' })
  rejectOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectOrderDto,
  ): Promise<StoreOrderResponse> {
    return this.service.rejectOrder(user.id, id, dto.reason ?? 'مرفوض من المتجر');
  }

  @Patch('orders/:id/preparing')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Mark order as preparing' })
  markPreparing(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoreOrderResponse> {
    return this.service.markPreparing(user.id, id);
  }

  @Patch('orders/:id/ready')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Mark order as ready' })
  markReady(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StoreOrderResponse> {
    return this.service.markReady(user.id, id);
  }

  @Patch('orders/:id/cancel')
  @RequirePermission('store.orders.manage_own')
  @ApiOperation({ summary: 'Cancel order (store owner)' })
  cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<StoreOrderResponse> {
    return this.service.cancelOrder(
      user.id,
      id,
      dto.reasonCode ?? 'store_too_busy',
      dto.note ?? null,
    );
  }

  // ───── الإحصائيات ─────

  @Get('stats')
  @RequirePermission('store.reports.read_own')
  @ApiOperation({ summary: 'Get my store stats' })
  getStats(@CurrentUser() user: AuthUser): Promise<StatsResponse> {
    return this.service.getStats(user.id);
  }
}
