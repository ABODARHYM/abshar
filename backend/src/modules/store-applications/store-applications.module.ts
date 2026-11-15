import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { StoreApplicationsService } from './store-applications.service';
import { PublicStoreApplicationsController } from './store-applications.controller';
import { AdminStoreApplicationsController } from './store-applications-admin.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PublicStoreApplicationsController,
    AdminStoreApplicationsController,
  ],
  providers: [StoreApplicationsService],
  exports: [StoreApplicationsService],
})
export class StoreApplicationsModule {}
