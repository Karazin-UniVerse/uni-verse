import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, type User } from '@universe/database';
import type { SessionUser } from '@universe/core/types/auth';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { UserService } from '../user/user.service';
import { BCRYPT_SALT_ROUNDS, JWT_ALGORITHM } from '../constants/auth';
import { GetCreds } from '../utils/get-creds';
import { GoogleAuthDto, LinkMoodleDto, LoginDto, RegisterDto } from './dto';
import {
  buildEmailWithDomain,
  extractGoogleUserName,
  isAllowedCorporateDomain,
  isPrismaUniqueConstraintError,
  normalizeEmail,
} from './utils/auth.utils';

export type GetTokensParams = {
  userId: string;
  email: string;
  roles?: string[];
};

// Not bcrypt: it reads only the first 72 bytes, which all refresh JWTs of one user share, so a rotated token still matched.
function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function isRefreshTokenMatch(
  refreshToken: string,
  storedHash: string,
): boolean {
  const actual = Buffer.from(hashRefreshToken(refreshToken), 'hex');
  const expected = Buffer.from(storedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly getCreds: GetCreds,
    private readonly jwtService: JwtService,
  ) {}

  private toSessionUser(user: User): SessionUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isLinked: Boolean(user.token && user.moodleId),
    };
  }

  async getSessionUser(userId: string): Promise<SessionUser> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSessionUser(user);
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = normalizeEmail(dto.email);
    const existingUser = await this.userService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const { moodleToken, moodleId } = await (async () => {
      try {
        const token = await this.getCreds.getToken(dto.email, dto.password);
        const rawMoodleId = await this.getCreds.getUserId(token);

        return { moodleToken: token, moodleId: String(rawMoodleId) };
      } catch (error) {
        throw new BadRequestException(
          `Moodle Authentication failed: ${(error as Error).message}`,
        );
      }
    })();

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await (async () => {
      try {
        return await this.userService.createUser({
          email: normalizedEmail,
          password: passwordHash,
          token: moodleToken,
          moodleId: moodleId,
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code: string }).code === 'P2002'
        ) {
          throw new BadRequestException('User with this email already exists');
        }

        throw error;
      }
    })();

    const tokens = await this.getTokens({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: this.toSessionUser(user),
    };
  }

  async login(dto: LoginDto) {
    const { moodleToken, moodleId } = await (async () => {
      try {
        const token = await this.getCreds.getToken(dto.email, dto.password);
        const rawMoodleId = await this.getCreds.getUserId(token);

        return { moodleToken: token, moodleId: String(rawMoodleId) };
      } catch (moodleErr) {
        throw new ForbiddenException(
          moodleErr instanceof Error
            ? moodleErr.message
            : 'Invalid Moodle credentials',
        );
      }
    })();

    const rawEmail = normalizeEmail(dto.email);
    const emailToUse = buildEmailWithDomain(rawEmail, 'student.karazin.ua');

    const user = await (async () => {
      const existing =
        (await this.userService.findByMoodleId(moodleId)) ||
        (await this.userService.findByEmail(rawEmail)) ||
        (await this.userService.findByEmail(emailToUse));

      if (!existing) {
        const hash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

        return await this.userService.createUser({
          email: emailToUse,
          password: hash,
          token: moodleToken,
          moodleId: moodleId,
        });
      }

      return await this.userService.updateUser(existing.id, {
        token: moodleToken,
        moodleId: moodleId,
      });
    })();

    const tokens = await this.getTokens({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: this.toSessionUser(user),
    };
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const { email, name } = await this.verifyGoogleIdToken(dto.idToken);
    const user = await this.findOrCreateGoogleUser(email, name);

    const isLinked = Boolean(user.token && user.moodleId);

    const tokens = await this.getTokens({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isLinked,
      user: this.toSessionUser(user),
    };
  }

  private async verifyGoogleIdToken(
    idToken: string,
  ): Promise<{ email: string; name?: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new BadRequestException(
        'Google authentication is not configured on the server',
      );
    }

    const client = new OAuth2Client(clientId);

    let payload;

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      payload = ticket.getPayload();
    } catch (err: unknown) {
      throw new BadRequestException(
        `Invalid Google ID token: ${(err as Error).message}`,
      );
    }

    if (!payload?.email || payload.email_verified !== true) {
      throw new BadRequestException(
        'Google token does not contain a verified email',
      );
    }

    const email = payload.email.toLowerCase();

    if (!isAllowedCorporateDomain(email, payload.hd)) {
      throw new ForbiddenException(
        'Доступ дозволено лише для облікових записів @student.karazin.ua та @karazin.ua',
      );
    }

    const name = extractGoogleUserName(payload);

    return { email, name };
  }

  private async findOrCreateGoogleUser(email: string, name?: string) {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      return existingUser;
    }

    const randomPassword = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      BCRYPT_SALT_ROUNDS,
    );

    try {
      return await this.userService.createUser({
        email,
        name,
        password: randomPassword,
      });
    } catch (err: unknown) {
      if (isPrismaUniqueConstraintError(err)) {
        const raceUser = await this.userService.findByEmail(email);

        if (raceUser) {
          return raceUser;
        }

        throw new BadRequestException('User with this email already exists');
      }

      throw err;
    }
  }

  async linkMoodleAccount(userId: string, dto: LinkMoodleDto) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { moodleToken, moodleId } = await (async () => {
      try {
        const token = await this.getCreds.getToken(dto.username, dto.password);
        const rawMoodleId = await this.getCreds.getUserId(token);

        return { moodleToken: token, moodleId: String(rawMoodleId) };
      } catch (error) {
        throw new BadRequestException(
          `Moodle Authentication failed: ${(error as Error).message}`,
        );
      }
    })();

    const existingMoodleUser = await this.userService.findByMoodleId(moodleId);

    if (existingMoodleUser && existingMoodleUser.id !== userId) {
      throw new ConflictException(
        'Moodle account is already linked to another user',
      );
    }

    const roles: Role[] = Array.from(
      new Set([...user.roles, Role.MOODLE_STUDENT]),
    );

    const updatedUser = await this.userService.updateUser(userId, {
      token: moodleToken,
      moodleId,
      roles,
    });

    const tokens = await this.getTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      roles: updatedUser.roles,
    });

    await this.updateRtHash(updatedUser.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isLinked: true,
      user: this.toSessionUser(updatedUser),
    };
  }

  async unlinkMoodleAccount(userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const roles: Role[] = Array.from(
      new Set([...user.roles, Role.OPPORTUNITIES_USER]),
    );

    const tokens = await this.getTokens({
      userId: user.id,
      email: user.email,
      roles,
    });

    await this.userService.updateUser(userId, {
      token: null,
      moodleId: null,
      refreshToken: hashRefreshToken(tokens.refresh_token),
      roles,
    });

    const unlinkedSessionUser = this.toSessionUser({
      ...user,
      token: null,
      moodleId: null,
      roles,
    });

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isLinked: false,
      user: unlinkedSessionUser,
    };
  }

  async logout(userId: string) {
    await this.userService.updateUser(userId, { refreshToken: null });
  }

  async logoutByRefreshToken(refreshToken: string): Promise<boolean> {
    const rtSecret = process.env.RT_SECRET;

    if (!rtSecret || rtSecret === 'your-refresh-token-secret-key') {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(
        refreshToken,
        { secret: rtSecret, algorithms: [JWT_ALGORITHM] },
      );

      if (!payload?.sub) {
        return false;
      }

      const user = await this.userService.findById(payload.sub);

      if (!user?.refreshToken) {
        return false;
      }

      if (!isRefreshTokenMatch(refreshToken, user.refreshToken)) {
        return false;
      }

      await this.userService.updateUser(user.id, { refreshToken: null });

      return true;
    } catch {
      return false;
    }
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.userService.findById(userId);

    if (!user?.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    if (!isRefreshTokenMatch(rt, user.refreshToken)) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: this.toSessionUser(user),
    };
  }

  async updateRtHash(userId: string, rt: string) {
    await this.userService.updateUser(userId, {
      refreshToken: hashRefreshToken(rt),
    });
  }

  async getTokens({ userId, email, roles }: GetTokensParams) {
    const atSecret = process.env.AT_SECRET;
    const rtSecret = process.env.RT_SECRET;
    const knownPlaceholders = new Set([
      'your-access-token-secret-key',
      'your-refresh-token-secret-key',
    ]);

    if (
      !atSecret ||
      !rtSecret ||
      knownPlaceholders.has(atSecret) ||
      knownPlaceholders.has(rtSecret)
    ) {
      throw new Error(
        'JWT secrets are not configured securely. Set valid AT_SECRET and RT_SECRET environment variables.',
      );
    }

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          roles,
        },
        {
          secret: atSecret,
          algorithm: JWT_ALGORITHM,
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: rtSecret,
          algorithm: JWT_ALGORITHM,
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}
