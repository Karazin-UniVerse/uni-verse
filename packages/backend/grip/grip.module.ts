import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiClientService } from './gemini-client.service';
import { GithubClientService } from './github-client.service';
import { GripController, GripEnabledGuard } from './grip.controller';
import { GripGuard } from './grip.guard';
import { GripQuotaService } from './grip-quota.service';
import { GripService } from './grip.service';
import { GripSessionService } from './grip-session.service';
import { GripStorageService } from './grip-storage.service';
import { GripBrowserAuthController } from './hosted/grip-browser-auth.controller';
import { GripBrowserCheckController } from './hosted/grip-browser-check.controller';
import { GripCheckController } from './hosted/grip-check.controller';
import { GripBrowserAuthService } from './hosted/grip-browser-auth.service';
import { GripCheckService } from './hosted/grip-check.service';
import { GripCheckStorageService } from './hosted/grip-check-storage.service';
import { GripHostedGuard } from './hosted/grip-hosted.guard';
import { GripHostedRateLimitService } from './hosted/grip-hosted-rate-limit.service';
import { GripHostedCleanupService } from './hosted/grip-hosted-cleanup.service';
import { GripHostedCleanupController } from './hosted/grip-hosted-cleanup.controller';
import { GripCleanupGuard } from './hosted/grip-cleanup.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    GripController,
    GripBrowserAuthController,
    GripBrowserCheckController,
    GripCheckController,
    GripHostedCleanupController,
  ],
  providers: [
    GripStorageService,
    GripQuotaService,
    GithubClientService,
    GripSessionService,
    GeminiClientService,
    GripService,
    GripGuard,
    GripEnabledGuard,
    GripBrowserAuthService,
    GripCheckService,
    GripCheckStorageService,
    GripHostedGuard,
    GripHostedRateLimitService,
    GripHostedCleanupService,
    GripCleanupGuard,
  ],
})
export class GripModule {}
