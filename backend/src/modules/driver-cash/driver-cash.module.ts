import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DriverCashController } from './driver-cash.controller';
import { DriverCashRepository } from './driver-cash.repository';
import { DriverCashService } from './driver-cash.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DriverCashController],
  providers: [DriverCashService, DriverCashRepository],
  exports: [DriverCashService, DriverCashRepository],
})
export class DriverCashModule {}
