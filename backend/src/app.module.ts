import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StoreOwnerModule } from './modules/store-owner/store-owner.module';
import { DriverModule } from './modules/driver/driver.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { GeographyModule } from './modules/geography/geography.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { DriverCashModule } from './modules/driver-cash/driver-cash.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReferralModule } from './modules/referral/referral.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: config.all.http.throttleTtlSeconds * 1000,
            limit: config.all.http.throttleLimit,
          },
        ],
      }),
    }),
    HealthModule,
    AuthModule,
    ProfileModule,
    AddressesModule,
    CategoriesModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    StoreOwnerModule,
    DriverModule,
    AdminModule,
    NotificationsModule,
    FinanceModule,
    DispatchModule,
    PricingModule,
    GeographyModule,
    CouponsModule,
    DriverCashModule,
    LoyaltyModule,
    ReferralModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
