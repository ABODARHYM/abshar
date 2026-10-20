import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DispatchRepository } from './dispatch.repository';
import { DispatchService } from './dispatch.service';

@Global()
@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [DispatchService, DispatchRepository],
  exports: [DispatchService],
})
export class DispatchModule {}
