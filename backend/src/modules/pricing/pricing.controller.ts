import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { PricingService } from './pricing.service';
import {
  DeliveryQuoteDto,
  ZoneResponseDto,
} from './dto/pricing-response.dto';

// ═══ DTOs ═══

class QuoteQueryDto {
  @ApiProperty() @IsUUID() storeId!: string;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  addressLat!: number;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  addressLng!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  addressId?: string;
}

class UpdateZoneDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  baseDeliveryFee?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  feePerKm?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @ValidateIf((o) => o.freeDeliveryThreshold !== null)
  @Type(() => Number) @IsNumber() @Min(1)
  freeDeliveryThreshold?: number | null;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(5)
  surgeMultiplier?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  fuelSurcharge?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
}

class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  default_delivery_fee?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  min_delivery_fee?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  max_delivery_fee?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  free_delivery_threshold?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(5)
  surge_multiplier?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  fuel_surcharge?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  distance_rounding?: number;
}

// ═══ Controller ═══

@ApiTags('pricing')
@ApiBearerAuth('access-token')
@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly service: PricingService) {}

  // ═══ Public Quote ═══

  @Get('quote')
  @ApiOperation({
    summary: 'Get delivery fee quote (customer)',
    description: 'حساب سعر التوصيل لموقع معيّن بدون إنشاء طلب',
  })
  @ApiResponse({ status: 200, type: DeliveryQuoteDto })
  async quote(@Query() query: QuoteQueryDto): Promise<DeliveryQuoteDto> {
    // نحتاج بيانات المتجر
    const store = await this.service['repo']['db'].query<{
      id: string;
      latitude: string | number;
      longitude: string | number;
      delivery_fee: string | number;
      min_order_amount: string | number;
    }>(
      `SELECT id, latitude, longitude, delivery_fee, min_order_amount FROM stores WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [query.storeId],
    );
    if (!store.rows[0]) {
      throw new Error('Store not found');
    }
    const s = store.rows[0];

    const currency = await this.service['repo']['db'].query<{ value: any }>(
      `SELECT value FROM settings WHERE key = 'currency' LIMIT 1`,
    );
    const currencyStr = String(currency.rows[0]?.value ?? 'USD').replace(/"/g, '');

    return this.service.quote({
      storeId: s.id,
      storeLat: Number(s.latitude),
      storeLng: Number(s.longitude),
      storeDeliveryFee: Number(s.delivery_fee),
      storeMinOrderAmount: Number(s.min_order_amount),
      addressLat: query.addressLat,
      addressLng: query.addressLng,
      subtotal: query.subtotal ?? 0,
      currency: currencyStr,
    });
  }

  // ═══ Zones (Public read, Admin write) ═══

  @Get('zones')
  @ApiOperation({ summary: 'List active delivery zones' })
  @ApiResponse({ status: 200, type: [ZoneResponseDto] })
  listZones(): Promise<ZoneResponseDto[]> {
    return this.service.listZones();
  }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Get zone by id' })
  @ApiResponse({ status: 200, type: ZoneResponseDto })
  getZone(@Param('id', ParseUUIDPipe) id: string): Promise<ZoneResponseDto> {
    return this.service.getZone(id);
  }

  @Patch('zones/:id')
  @RequirePermission('zones.manage')
  @ApiOperation({ summary: 'Update zone (admin)' })
  @ApiResponse({ status: 200, type: ZoneResponseDto })
  updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZoneDto,
  ): Promise<ZoneResponseDto> {
    return this.service.updateZone(id, dto);
  }

  // ═══ Settings (Admin) ═══

  @Get('settings')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Get pricing settings (admin)' })
  getSettings(): Promise<Record<string, number>> {
    return this.service.getSettings();
  }

  @Patch('settings')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Update pricing settings (admin)' })
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<{ updated: number }> {
    const settings: Record<string, number> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) settings[k] = v as number;
    }
    return this.service.updateSettings(user.id, settings);
  }
}
