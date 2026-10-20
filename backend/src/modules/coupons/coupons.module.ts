import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CouponsController } from './coupons.controller';
import { CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CouponsController],
  providers: [CouponsService, CouponsRepository],
  exports: [CouponsService, CouponsRepository],
})
export class CouponsModule {}
