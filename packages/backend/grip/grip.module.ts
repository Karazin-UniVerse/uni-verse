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

@Module({
  imports: [PrismaModule],
  controllers: [GripController],
  providers: [
    GripStorageService,
    GripQuotaService,
    GithubClientService,
    GripSessionService,
    GeminiClientService,
    GripService,
    GripGuard,
    GripEnabledGuard,
  ],
})
export class GripModule {}
