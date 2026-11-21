import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { StoresModule } from '../stores/stores.module';
import { ProductsModule } from '../products/products.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { AdminService } from './admin.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, StoresModule, ProductsModule, DispatchModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
