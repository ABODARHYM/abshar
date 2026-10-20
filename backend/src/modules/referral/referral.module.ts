import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralAdminController } from './referral-admin.controller';
import { ReferralService } from './referral.service';
import { ReferralRepository } from './referral.repository';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [LoyaltyModule],
  controllers: [ReferralController, ReferralAdminController],
  providers: [ReferralService, ReferralRepository],
  exports: [ReferralService],
})
export class ReferralModule {}
