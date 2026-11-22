import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AUTH_ROUTES } from '@universe/core/constants/routes';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  AuthResponseDto,
  GoogleAuthDto,
  GoogleAuthResponseDto,
  LinkMoodleDto,
  LoginDto,
  LogoutResponseDto,
  RegisterDto,
  SessionUserDto,
} from './dto';
import { RtGuard } from './guards/rt.guard';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post(AUTH_ROUTES.REGISTER)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    type: AuthResponseDto,
    description: 'User successfully created.',
  })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);

    this.setAuthCookies(res, result);

    return { user: result.user };
  }

  @Public()
  @Post(AUTH_ROUTES.LOGIN)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    type: AuthResponseDto,
    description: 'User successfully logged in.',
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);

    this.setAuthCookies(res, result);

    return { user: result.user };
  }

  @Public()
  @Post(AUTH_ROUTES.GOOGLE)
  @ApiOperation({ summary: 'Login or register user via Google SSO' })
  @ApiResponse({
    status: 200,
    type: GoogleAuthResponseDto,
    description: 'User successfully authenticated via Google.',
  })
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleAuthResponseDto> {
    const result = await this.authService.loginWithGoogle(dto);

    this.setAuthCookies(res, result);

    return {
      isLinked: result.isLinked,
      user: result.user,
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('accessToken')
  @Post(AUTH_ROUTES.MOODLE_LINK)
  @ApiOperation({ summary: 'Link Moodle account to authenticated user' })
  @ApiResponse({
    status: 200,
    type: GoogleAuthResponseDto,
    description: 'Moodle account successfully linked.',
  })
  @HttpCode(HttpStatus.OK)
  async linkMoodle(
    @GetUser('sub') userId: string,
    @Body() dto: LinkMoodleDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleAuthResponseDto> {
    const result = await this.authService.linkMoodleAccount(userId, dto);

    this.setAuthCookies(res, result);

    return {
      isLinked: result.isLinked,
      user: result.user,
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('accessToken')
  @Post(AUTH_ROUTES.MOODLE_UNLINK)
  @ApiOperation({ summary: 'Unlink Moodle account from authenticated user' })
  @ApiResponse({
    status: 200,
    type: GoogleAuthResponseDto,
    description: 'Moodle account successfully unlinked.',
  })
  @HttpCode(HttpStatus.OK)
  async unlinkMoodle(
    @GetUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleAuthResponseDto> {
    const result = await this.authService.unlinkMoodleAccount(userId);

    this.setAuthCookies(res, result);

    return {
      isLinked: result.isLinked,
      user: result.user,
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('accessToken')
  @Header('Cache-Control', 'no-store')
  @Get(AUTH_ROUTES.ME)
  @ApiOperation({ summary: 'Get current authenticated user session' })
  @ApiResponse({
    status: 200,
    type: SessionUserDto,
    description: 'Authenticated user session metadata.',
  })
  async me(@GetUser('sub') userId: string): Promise<SessionUserDto> {
    return this.authService.getSessionUser(userId);
  }

  @Public()
  @ApiBearerAuth()
  @ApiCookieAuth('accessToken')
  @ApiCookieAuth('refreshToken')
  @Post(AUTH_ROUTES.LOGOUT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    type: LogoutResponseDto,
    description: 'User successfully logged out.',
  })
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser('sub') userId: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    if (userId) {
      await this.authService.logout(userId);
      this.clearAuthCookies(res);

      return { message: 'Logged out successfully' };
    }

    const cookies = req.cookies as Record<string, unknown> | undefined;
    const refreshToken =
      typeof cookies?.refreshToken === 'string'
        ? cookies.refreshToken
        : undefined;
    const hasAccessCookie = typeof cookies?.accessToken === 'string';

    if (refreshToken) {
      const revoked = await this.authService.logoutByRefreshToken(refreshToken);

      this.clearAuthCookies(res);

      if (revoked) {
        return { message: 'Logged out successfully' };
      }

      throw new UnauthorizedException();
    }

    if (hasAccessCookie) {
      this.clearAuthCookies(res);
    }

    throw new UnauthorizedException();
  }

  @Public()
  @UseGuards(RtGuard)
  @ApiCookieAuth('refreshToken')
  @Post(AUTH_ROUTES.REFRESH)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    type: AuthResponseDto,
    description: 'Token successfully refreshed.',
  })
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetUser('sub') userId: string,
    @GetUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.refreshTokens(userId, refreshToken);

    this.setAuthCookies(res, result);

    return { user: result.user };
  }

  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ): void {
    res.cookie(
      'accessToken',
      tokens.access_token,
      this.getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
    );
    res.cookie(
      'refreshToken',
      tokens.refresh_token,
      this.getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
    );
  }

  private clearAuthCookies(res: Response): void {
    const clearOptions = this.getClearAuthCookieOptions();

    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
  }

  private getAuthCookieOptions(maxAge: number): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
    };
  }

  private getClearAuthCookieOptions(): CookieOptions {
    const { maxAge: _unused, ...clearOptions } = this.getAuthCookieOptions(
      REFRESH_TOKEN_MAX_AGE_MS,
    );

    return clearOptions;
  }
}
