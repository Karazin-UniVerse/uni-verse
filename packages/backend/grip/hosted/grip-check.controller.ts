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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type {
  GripCheckStatus,
  GripCreatedCheck,
} from '@universe/core/types/grip-hosted';
import { Public } from '../../auth/decorators/public.decorator';
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

  @Public()
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

  @Public()
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

  @Public()
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

  @Public()
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
