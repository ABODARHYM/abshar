import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StoresController],
  providers: [StoresService, StoresRepository],
  exports: [StoresService],
})
export class StoresModule {}
