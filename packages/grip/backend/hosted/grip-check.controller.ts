import {
  Body,
  Controller,
  Get,
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
import type { GripCheckStatus, GripCreatedCheck } from '@universe/core/types/grip-hosted';
import { IS_PUBLIC_KEY } from '@universe/core/constants/auth';
import { CurrentGripPrincipal } from '../grip.decorators';
import { GripGuard } from '../grip.guard';
import type { GripPrincipal } from '../grip.types';
import { GripCheckService } from './grip-check.service';
import { GripCheckStorageService } from './grip-check-storage.service';
import { GripCreateCheckDto } from './dto/grip-check.dto';
import { GripHostedGuard, requireGripHostedConfig } from './grip-hosted.guard';
import { GripHostedRateLimitService } from './grip-hosted-rate-limit.service';
import { GripHostedHttpFilter } from './grip-hosted-http.filter';
import { gripOperationResponse } from './grip-operation-response';

@ApiTags('Dev Tools - Hosted Grip')
@Controller('dev-tools/grip/checks')
@UseGuards(GripHostedGuard, GripGuard)
@UseFilters(GripHostedHttpFilter)
export class GripCheckController {
  constructor(
    private readonly checks: GripCheckService,
    private readonly storage: GripCheckStorageService,
    private readonly limits: GripHostedRateLimitService,
  ) {}

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post()
  async create(
    @CurrentGripPrincipal() principal: GripPrincipal,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: GripCreateCheckDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripCreatedCheck> {
    response.setHeader('Cache-Control', 'no-store');

    return this.checks.create({
      ownerGithubId: principal.githubId,
      config: requireGripHostedConfig(),
      input,
    });
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post(':checkId/generation')
  @HttpCode(HttpStatus.OK)
  async generate(
    @CurrentGripPrincipal() principal: GripPrincipal,
    @Param('checkId') checkId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripCheckStatus> {
    const result = await this.checks.generate({
      ownerGithubId: principal.githubId,
      checkId,
      config: requireGripHostedConfig(),
    });

    return gripOperationResponse(result, response);
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Get(':checkId/status')
  async status(
    @CurrentGripPrincipal() principal: GripPrincipal,
    @Param('checkId') checkId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripCheckStatus> {
    response.setHeader('Cache-Control', 'no-store');
    await this.limits.reserveRead(principal.sessionId);

    return this.checks.readStatus({
      ownerGithubId: principal.githubId,
      checkId,
    });
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post(':checkId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentGripPrincipal() principal: GripPrincipal,
    @Param('checkId') checkId: string,
  ): Promise<void> {
    await this.storage.cancelCheck({
      ownerGithubId: principal.githubId,
      checkId,
    });
  }
}
