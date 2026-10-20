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
import { IsOptional, IsBooleanString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import {
  CouponResponseDto,
  CouponValidationDto,
} from './dto/coupon-response.dto';

class ListCouponsDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

@ApiTags('coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon before ordering (customer)' })
  @ApiResponse({ status: 200, type: CouponValidationDto })
  validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateCouponDto,
  ): Promise<CouponValidationDto> {
    return this.service.validate(user.id, dto);
  }

  @Get()
  @RequirePermission('coupons.manage')
  @ApiOperation({ summary: 'List coupons (admin)' })
  list(@Query() query: ListCouponsDto) {
    const isActive =
      query.isActive === undefined ? undefined : query.isActive === 'true';
    return this.service.list({
      page: query.page,
      limit: query.limit,
      isActive,
    });
  }

  @Get(':id')
  @RequirePermission('coupons.manage')
  @ApiOperation({ summary: 'Get coupon (admin)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CouponResponseDto> {
    return this.service.get(id);
  }

  @Post()
  @RequirePermission('coupons.manage')
  @ApiOperation({ summary: 'Create coupon (admin)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @RequirePermission('coupons.manage')
  @ApiOperation({ summary: 'Update coupon (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('coupons.manage')
  @ApiOperation({ summary: 'Disable coupon (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
