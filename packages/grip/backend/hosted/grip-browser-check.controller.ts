import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseFilters,
  UseGuards,
  ValidationPipe,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { GripCheckStatus, GripCheckView } from '@universe/core/types/grip-hosted';
import { IS_PUBLIC_KEY } from '@universe/core/constants/auth';
import { GripCheckService } from './grip-check.service';
import { GripCheckStorageService } from './grip-check-storage.service';
import { GripBrowserAuthService } from './grip-browser-auth.service';
import { browserToken } from './grip-browser-auth.controller';
import { GripSubmissionDto } from './dto/grip-check.dto';
import { GripHostedGuard, requireGripHostedConfig } from './grip-hosted.guard';
import { GripHostedRateLimitService } from './grip-hosted-rate-limit.service';
import { GripHostedHttpFilter } from './grip-hosted-http.filter';
import { gripOperationResponse } from './grip-operation-response';

@ApiTags('Dev Tools - Hosted Grip')
@Controller('dev-tools/grip/browser/checks')
@UseGuards(GripHostedGuard)
@UseFilters(GripHostedHttpFilter)
export class GripBrowserCheckController {
  constructor(
    private readonly auth: GripBrowserAuthService,
    private readonly checks: GripCheckService,
    private readonly storage: GripCheckStorageService,
    private readonly limits: GripHostedRateLimitService,
  ) {}

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Get(':checkId')
  async view(
    @Headers('authorization') header: string | undefined,
    @Param('checkId') checkId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripCheckView> {
    const config = requireGripHostedConfig();
    const token = browserToken(header);
    const identity = await this.auth.authenticateBrowser({ token, config });

    await this.limits.reserveRead(token);

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    return this.checks.readView({
      ownerGithubId: identity.githubId,
      checkId,
      config,
    });
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post(':checkId/submissions')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Headers('authorization') header: string | undefined,
    @Headers('origin') origin: string | undefined,
    @Headers('x-grip-csrf') csrfToken: string | undefined,
    @Param('checkId') checkId: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: GripSubmissionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripCheckStatus> {
    const config = requireGripHostedConfig();
    const identity = await this.auth.authenticateBrowser({
      token: browserToken(header),
      config,
    });

    this.auth.assertCsrf({
      identity,
      config,
      origin: origin ?? '',
      csrfToken: csrfToken ?? '',
    });

    const result = await this.checks.submit({
      ownerGithubId: identity.githubId,
      checkId,
      config,
      input,
    });

    return gripOperationResponse(result, response);
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post(':checkId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Headers('authorization') header: string | undefined,
    @Headers('origin') origin: string | undefined,
    @Headers('x-grip-csrf') csrfToken: string | undefined,
    @Param('checkId') checkId: string,
  ): Promise<void> {
    const config = requireGripHostedConfig();
    const identity = await this.auth.authenticateBrowser({
      token: browserToken(header),
      config,
    });

    this.auth.assertCsrf({
      identity,
      config,
      origin: origin ?? '',
      csrfToken: csrfToken ?? '',
    });
    await this.storage.cancelCheck({
      ownerGithubId: identity.githubId,
      checkId,
    });
  }
}
