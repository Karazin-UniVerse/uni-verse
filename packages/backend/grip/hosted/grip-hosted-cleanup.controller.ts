import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { GripCleanupGuard } from './grip-cleanup.guard';
import { GripHostedCleanupService } from './grip-hosted-cleanup.service';

@ApiTags('Dev Tools - Hosted Grip')
@ApiBearerAuth()
@Controller('dev-tools/grip/internal')
@UseGuards(GripCleanupGuard)
export class GripHostedCleanupController {
  constructor(private readonly cleanup: GripHostedCleanupService) {}

  @Public()
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purge expired hosted Grip data using verified scheduler OIDC',
  })
  async run(): ReturnType<
    GripHostedCleanupService['cleanupExpiredHostedData']
  > {
    return this.cleanup.cleanupExpiredHostedData({
      now: new Date(),
      batchSize: 100,
    });
  }
}
