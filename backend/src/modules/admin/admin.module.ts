import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminService } from './admin.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
