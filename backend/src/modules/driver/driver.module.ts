import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { DriverCashModule } from '../driver-cash/driver-cash.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { DriverController } from './driver.controller';
import { DriverRepository } from './driver.repository';
import { DriverService } from './driver.service';

@Module({
  imports: [DatabaseModule, FinanceModule, NotificationsModule, DispatchModule, DriverCashModule, LoyaltyModule],
  controllers: [DriverController],
  providers: [DriverService, DriverRepository],
  exports: [DriverService],
})
export class DriverModule {}
