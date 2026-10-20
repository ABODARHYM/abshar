import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { StoreOwnerController } from './store-owner.controller';
import { StoreOwnerRepository } from './store-owner.repository';
import { StoreOwnerService } from './store-owner.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, DispatchModule],
  controllers: [StoreOwnerController],
  providers: [StoreOwnerService, StoreOwnerRepository],
  exports: [StoreOwnerService],
})
export class StoreOwnerModule {}
