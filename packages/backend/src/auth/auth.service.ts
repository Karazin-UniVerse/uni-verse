import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GetCreds } from '../utils/get-creds';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { RegisterDto, LoginDto, GoogleAuthDto, LinkMoodleDto } from './dto';
import {
  normalizeEmail,
  buildEmailWithDomain,
  isPrismaUniqueConstraintError,
} from './utils/auth.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly getCreds: GetCreds,
    private readonly jwtService: JwtService,
  ) {}

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

    const passwordHash = await this.hashData(dto.password);

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

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.token ?? undefined,
      user.moodleId ?? undefined,
    );

    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
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
        const hash = await bcrypt.hash(dto.password, 10);

        return await this.userService.createUser({
          email: emailToUse,
          password: hash,
          token: moodleToken,
          moodleId: moodleId,
        });
      }

      await this.userService.updateUser(existing.id, {
        token: moodleToken,
        moodleId: moodleId,
      });

      return existing;
    })();

    const tokens = await this.getTokens(
      user.id,
      user.email,
      moodleToken,
      moodleId,
    );

    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const { email, name } = await this.verifyGoogleIdToken(dto.idToken);
    const user = await this.findOrCreateGoogleUser(email, name);

    const isLinked = Boolean(user.token && user.moodleId);

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.token ?? undefined,
      user.moodleId ?? undefined,
    );

    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isLinked,
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
    const fallbackName =
      `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
    const name = payload.name || fallbackName || undefined;

    return { email, name };
  }

  private async findOrCreateGoogleUser(email: string, name?: string) {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      return existingUser;
    }

    const randomPassword = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      10,
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

    const updatedUser = await this.userService.updateUser(userId, {
      token: moodleToken,
      moodleId,
    });

    const tokens = await this.getTokens(
      updatedUser.id,
      updatedUser.email,
      moodleToken,
      moodleId,
    );

    await this.updateRtHash(updatedUser.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isLinked: true,
    };
  }

  async logout(userId: string) {
    await this.userService.updateUser(userId, { refreshToken: null });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.userService.findById(userId);

    if (!user?.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(rt, user.refreshToken);

    if (!rtMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.token ?? undefined,
    );

    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async updateRtHash(userId: string, rt: string) {
    const hash = await this.hashData(rt);

    await this.userService.updateUser(userId, { refreshToken: hash });
  }

  hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async getTokens(
    userId: string,
    email: string,
    moodleToken?: string,
    moodleId?: string,
  ) {
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
          moodleToken,
          moodleId,
        },
        {
          secret: atSecret,
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
