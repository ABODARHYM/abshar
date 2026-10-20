import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProfileController } from './profile.controller';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository],
  exports: [ProfileService],
})
export class ProfileModule {}
