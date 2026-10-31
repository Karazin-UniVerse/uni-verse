import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type {
  GripCompletionResponse,
  GripSessionResponse,
} from '@universe/core/types/grip';
import { Public } from '../auth/decorators/public.decorator';
import { GripSessionResponseDto } from './dto/session-response.dto';
import { GripCompletionResponseDto } from './dto/completion-response.dto';
import { CurrentGripPrincipal } from './grip.decorators';
import { GripGuard } from './grip.guard';
import {
  resolveClientIp,
  resolveGripConfig,
  validateGripCompletion,
} from './grip.helpers';
import { GripService } from './grip.service';
import { GripSessionService } from './grip-session.service';
import type { GripConfig, GripPrincipal } from './grip.types';

@Injectable()
export class GripEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.GRIP_GATEWAY_ENABLED !== 'true') {
      throw new NotFoundException('Grip gateway is disabled');
    }

    resolveGripConfig();

    return true;
  }
}

@ApiTags('Dev Tools - Grip')
@UseGuards(GripEnabledGuard)
@Controller('dev-tools/grip')
export class GripController {
  constructor(
    private readonly sessionService: GripSessionService,
    private readonly gripService: GripService,
    @Optional()
    @Inject('GRIP_CONFIG')
    private readonly injectedConfig?: GripConfig | null,
  ) {}

  private getConfig(): GripConfig {
    return resolveGripConfig(this.injectedConfig);
  }

  @Public()
  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange GitHub access token for Grip gateway token',
  })
  @ApiResponse({
    status: 200,
    type: GripSessionResponseDto,
    description: 'Session created successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid GitHub token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: repository write access required',
  })
  @ApiResponse({ status: 429, description: 'Exchange rate limit exceeded' })
  async createSession(
    @Headers('authorization') authHeader: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GripSessionResponse> {
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const githubToken = authHeader.slice(7).trim();

    if (!githubToken) {
      throw new UnauthorizedException('Empty GitHub access token');
    }

    const clientIp = resolveClientIp(
      req,
      this.getConfig().trustedProxyAddresses,
    );

    const session = await this.sessionService.exchange({
      githubToken,
      clientIp,
    });

    res.setHeader('Cache-Control', 'no-store');

    return session;
  }

  @Public()
  @Delete('sessions/current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current Grip gateway session' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid Authorization header',
  })
  async revokeSession(
    @Headers('authorization') authHeader: string | undefined,
  ): Promise<void> {
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Empty session token');
    }

    await this.sessionService.revoke(token);
  }

  @Public()
  @UseGuards(GripGuard)
  @Post('v1/chat/completions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request Grip model chat completion' })
  @ApiResponse({
    status: 200,
    type: GripCompletionResponseDto,
    description: 'Completion successful',
  })
  @ApiResponse({ status: 400, description: 'Invalid completion request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit or concurrency limit exceeded',
  })
  async complete(
    @CurrentGripPrincipal() principal: GripPrincipal,
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GripCompletionResponse> {
    const validatedRequest = validateGripCompletion(body);
    const abortController = new AbortController();

    const onAbort = (): void => {
      abortController.abort();
    };

    req.on('aborted', onAbort);
    res.on('close', onAbort);

    try {
      if (req.aborted || res.destroyed) {
        throw new BadRequestException('Grip client disconnected');
      }

      const response = await this.gripService.complete({
        principal,
        request: validatedRequest,
        signal: abortController.signal,
      });

      return response;
    } finally {
      req.off('aborted', onAbort);
      res.off('close', onAbort);
    }
  }
}
