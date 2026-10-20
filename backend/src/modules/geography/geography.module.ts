import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GeographyController } from './geography.controller';
import { GeographyRepository } from './geography.repository';
import { GeographyService } from './geography.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GeographyController],
  providers: [GeographyService, GeographyRepository],
  exports: [GeographyService, GeographyRepository],
})
export class GeographyModule {}
