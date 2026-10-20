import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PricingController } from './pricing.controller';
import { PricingRepository } from './pricing.repository';
import { PricingService } from './pricing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PricingController],
  providers: [PricingService, PricingRepository],
  exports: [PricingService, PricingRepository],
})
export class PricingModule {}
