import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';
import { DatabaseService } from '../database/database.service';
import { ErrorCode } from '../common/error-codes';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness - العملية تعمل (Auth: لا يوجد)' })
  @ApiResponse({ status: 200, description: 'status ok' })
  liveness(): { status: 'ok'; tier: string; uptimeSeconds: number } {
    return { status: 'ok', tier: this.config.all.tier, uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness - يتحقق من اتصال PostgreSQL (Auth: لا يوجد)' })
  @ApiResponse({ status: 200, description: 'ready' })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
  async readiness(): Promise<{ status: 'ready'; database: 'up' }> {
    const up = await this.db.ping();
    if (!up) {
      throw new ServiceUnavailableException({
        code: ErrorCode.ServiceUnavailable,
        message: 'Database is not reachable',
      });
    }
    return { status: 'ready', database: 'up' };
  }
}
