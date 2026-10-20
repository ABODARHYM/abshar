import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty() totalUsers!: number;
  @ApiProperty() activeUsers!: number;
  @ApiProperty() totalStores!: number;
  @ApiProperty() activeStores!: number;
  @ApiProperty() totalDrivers!: number;
  @ApiProperty() activeDrivers!: number;
  @ApiProperty() totalOrders!: number;
  @ApiProperty() pendingOrders!: number;
  @ApiProperty() deliveredOrders!: number;
  @ApiProperty() cancelledOrders!: number;
  @ApiProperty() totalRevenue!: number;
  @ApiProperty() todayOrders!: number;
  @ApiProperty() todayRevenue!: number;
}

export class AdminUserListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() fullName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() roles!: string[];
  @ApiProperty({ nullable: true }) lastLoginAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class AdminUserDetailDto extends AdminUserListItemDto {
  @ApiProperty() locale!: string;
  @ApiProperty({ nullable: true }) emailVerifiedAt!: string | null;
  @ApiProperty({ nullable: true }) phoneVerifiedAt!: string | null;
}

export class AdminStoreListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() status!: string;
  @ApiProperty() isOpen!: boolean;
  @ApiProperty({ nullable: true }) ownerEmail!: string | null;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty() createdAt!: string;
}

export class AdminDriverListItemDto {
  @ApiProperty() userId!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) vehicleType!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() availability!: string;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
}

export class AdminOrderListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty({ nullable: true }) driverName!: string | null;
  @ApiProperty() total!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() createdAt!: string;
}

export class AdminAuditLogDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) actorUserId!: string | null;
  @ApiProperty({ nullable: true }) actorRole!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ nullable: true }) entityId!: string | null;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
  @ApiProperty() createdAt!: string;
}

export class AdminRoleDto {
  @ApiProperty() id!: number;
  @ApiProperty() code!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
}
