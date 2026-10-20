import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyRepository } from './loyalty.repository';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyRepository],
  exports: [LoyaltyService, LoyaltyRepository],
})
export class LoyaltyModule {}
