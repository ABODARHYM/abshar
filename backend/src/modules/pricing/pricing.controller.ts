import {
  BadRequestException,
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
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
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

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  addressLat?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  addressLng?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  addressId?: string;
}

class CreateDistanceTierDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0)
  minDistanceKm!: number;

  @ApiPropertyOptional({ nullable: true }) @IsOptional()
  @Type(() => Number) @IsNumber() @Min(0)
  maxDistanceKm?: number | null;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0)
  deliveryFee!: number;
}

class UpdateDistanceTierDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minDistanceKm?: number;

  @ApiPropertyOptional({ nullable: true }) @IsOptional()
  @Type(() => Number) @IsNumber() @Min(0)
  maxDistanceKm?: number | null;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
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

class CreateZoneDto {
  @ApiProperty() @IsUUID()
  cityId!: string;

  @ApiProperty({ maxLength: 120 }) @IsString() @MinLength(2) @MaxLength(120)
  nameAr!: string;

  @ApiProperty({ maxLength: 120 }) @IsString() @MinLength(2) @MaxLength(120)
  nameEn!: string;
}

class UpdateZoneCoverageDto {
  @ApiProperty({ enum: ['unverified', 'verified', 'rejected'] })
  @IsIn(['unverified', 'verified', 'rejected'])
  status!: 'unverified' | 'verified' | 'rejected';

  @ApiPropertyOptional({ nullable: true, description: 'GeoJSON Polygon or MultiPolygon using [longitude, latitude] positions' })
  @IsOptional() @IsObject()
  geojson?: Record<string, unknown> | null;

  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8)
  note!: string;
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
  async quote(
    @Query() query: QuoteQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeliveryQuoteDto> {
    let zoneId = query.zoneId;
    let addressLat = query.addressLat;
    let addressLng = query.addressLng;

    if (query.addressId) {
      const address = await this.service.getAddressForQuote(query.addressId, user.id);
      if (zoneId && zoneId !== address.zoneId) {
        throw new BadRequestException({
          message: 'منطقة التوصيل لا تتطابق مع العنوان المحدد.',
        });
      }
      zoneId = address.zoneId;
      addressLat = address.addressLat;
      addressLng = address.addressLng;
    }

    if (!zoneId || addressLat === undefined || addressLng === undefined) {
      throw new BadRequestException({
        message: 'يجب تحديد عنوان محفوظ أو منطقة التوصيل وإحداثيات العنوان.',
      });
    }

    const store = await this.service.getStoreQuoteDetails(query.storeId);

    return this.service.quote({
      ...store,
      zoneId,
      addressLat,
      addressLng,
      subtotal: query.subtotal ?? 0,
    });
  }

  // ═══ Zones (Public read, Admin write) ═══

  @Get('zones/admin')
  @RequirePermission('zones.manage')
  @ApiOperation({ summary: 'List all delivery zones including unverified legacy records (admin)' })
  listZonesForAdmin() { return this.service.listZonesForAdmin(); }

  @Post('zones')
  @RequirePermission('zones.manage')
  @ApiOperation({ summary: 'Create an inactive operational delivery zone (admin)' })
  createZone(@Body() dto: CreateZoneDto) {
    return this.service.createZone({ cityId: dto.cityId, nameAr: dto.nameAr, nameEn: dto.nameEn });
  }

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


  @Patch('zones/:id/coverage')
  @RequirePermission('zones.manage')
  @ApiOperation({ summary: 'Set and explicitly approve a delivery coverage polygon (admin)' })
  updateZoneCoverage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateZoneCoverageDto,
  ) {
    return this.service.updateZoneCoverage({
      zoneId: id, geojson: dto.geojson ?? null, status: dto.status,
      actorId: user.id, note: dto.note,
    });
  }

  @Get('zones/:id/distance-tiers')
  @RequirePermission('zones.manage')
  listDistanceTiers(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listDistanceTiers(id);
  }

  @Post('zones/:id/distance-tiers')
  @RequirePermission('zones.manage')
  createDistanceTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDistanceTierDto,
  ) {
    return this.service.createDistanceTier({
      zoneId: id,
      minDistanceKm: dto.minDistanceKm,
      maxDistanceKm: dto.maxDistanceKm ?? null,
      deliveryFee: dto.deliveryFee,
    });
  }

  @Patch('distance-tiers/:id')
  @RequirePermission('zones.manage')
  updateDistanceTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistanceTierDto,
  ) {
    return this.service.updateDistanceTier(id, dto);
  }

  @Delete('distance-tiers/:id')
  @RequirePermission('zones.manage')
  deactivateDistanceTier(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivateDistanceTier(id);
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
