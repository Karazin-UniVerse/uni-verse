import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
  UseGuards,
  ValidationPipe,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { GripBrowserIdentity } from '@universe/core/types/grip-hosted';
import { IS_PUBLIC_KEY } from '@universe/core/constants/auth';
import { GripBrowserAuthService } from './grip-browser-auth.service';
import { GripHostedGuard, requireGripHostedConfig } from './grip-hosted.guard';
import { GripBrowserCallbackDto, GripBrowserLoginDto } from './dto/grip-browser-auth.dto';
import { GripHostedRateLimitService } from './grip-hosted-rate-limit.service';
import { GripHostedHttpFilter } from './grip-hosted-http.filter';
import { resolveClientIp, resolveGripConfig } from '../grip.helpers';
import { GripQuotaService } from '../grip-quota.service';

export function browserToken(header: string | undefined): string {
  if (!header?.startsWith('GripBrowser ') || !header.slice('GripBrowser '.length).trim()) {
    throw new UnauthorizedException('Grip browser session required');
  }

  return header.slice('GripBrowser '.length).trim();
}

@ApiTags('Dev Tools - Hosted Grip')
@Controller('dev-tools/grip/browser')
@UseGuards(GripHostedGuard)
@UseFilters(GripHostedHttpFilter)
export class GripBrowserAuthController {
  constructor(
    private readonly auth: GripBrowserAuthService,
    private readonly limits: GripHostedRateLimitService,
    private readonly quota: GripQuotaService,
  ) {}

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post('auth/start')
  async start(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: GripBrowserLoginDto,
    @Req() request: Request,
  ): Promise<{ authorizationUrl: string }> {
    await this.limits.reserveAuthStart(
      resolveClientIp(request, resolveGripConfig().trustedProxyAddresses),
    );

    return this.auth.startBrowserLogin({
      ...input,
      config: requireGripHostedConfig(),
      clientId: process.env.GRIP_GITHUB_OAUTH_CLIENT_ID ?? '',
    });
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post('auth/callback')
  async callback(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: GripBrowserCallbackDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    token: string;
    identity: GripBrowserIdentity;
    returnCheckId: string;
  }> {
    response.setHeader('Cache-Control', 'no-store');
    await this.quota.reserveSessionExchange(
      resolveClientIp(request, resolveGripConfig().trustedProxyAddresses),
    );

    const result = await this.auth.completeBrowserLogin({
      ...input,
      config: requireGripHostedConfig(),
      clientId: process.env.GRIP_GITHUB_OAUTH_CLIENT_ID ?? '',
    });

    return {
      token: result.token,
      returnCheckId: result.returnCheckId,
      identity: {
        githubId: result.identity.githubId,
        login: result.identity.login,
        expiresAt: result.identity.expiresAt,
        csrfToken: result.identity.csrfToken,
      },
    };
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Get('session')
  async session(
    @Headers('authorization') header: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GripBrowserIdentity> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    const token = browserToken(header);
    const identity = await this.auth.authenticateBrowser({
      token,
      config: requireGripHostedConfig(),
    });

    await this.limits.reserveRead(token);

    return {
      githubId: identity.githubId,
      login: identity.login,
      expiresAt: identity.expiresAt,
      csrfToken: identity.csrfToken,
    };
  }

  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers('authorization') header: string | undefined,
    @Headers('origin') origin: string | undefined,
    @Headers('x-grip-csrf') csrfToken: string | undefined,
  ): Promise<void> {
    const config = requireGripHostedConfig();
    const token = browserToken(header);
    const identity = await this.auth.authenticateBrowser({ token, config });

    this.auth.assertCsrf({
      identity,
      config,
      origin: origin ?? '',
      csrfToken: csrfToken ?? '',
    });
    await this.auth.revokeBrowserSession(token);
  }
}
