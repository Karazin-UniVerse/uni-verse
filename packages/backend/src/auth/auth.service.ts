import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GetCreds } from '../utils/get-creds';
import { User } from '@universe/database';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private getCreds: GetCreds,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    let moodleToken = '';
    let moodleId = '';
    try {
      moodleToken = await this.getCreds.getToken(dto.email, dto.password);
      const rawMoodleId = await this.getCreds.getUserId(moodleToken);
      moodleId = String(rawMoodleId);
    } catch (error) {
      throw new BadRequestException(
        `Moodle Authentication failed: ${(error as Error).message}`,
      );
    }

    const passwordHash = await this.hashData(dto.password);

    let user: User;
    try {
      user = await this.userService.createUser({
        email: dto.email,
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
    let moodleToken: string;
    let moodleId: string;

    try {
      moodleToken = await this.getCreds.getToken(dto.email, dto.password);
      const rawMoodleId = await this.getCreds.getUserId(moodleToken);
      moodleId = String(rawMoodleId);
    } catch (moodleErr) {
      throw new ForbiddenException(
        moodleErr instanceof Error
          ? moodleErr.message
          : 'Invalid Moodle credentials',
      );
    }

    const emailToUse = dto.email.includes('@')
      ? dto.email
      : `${dto.email}@student.karazin.ua`;

    let user =
      (await this.userService.findByEmail(dto.email)) ||
      (await this.userService.findByEmail(emailToUse)) ||
      (await this.userService.findByMoodleId(moodleId));

    if (!user) {
      const hash = await bcrypt.hash(dto.password, 10);
      user = await this.userService.createUser({
        email: emailToUse,
        password: hash,
        token: moodleToken,
        moodleId: moodleId,
      });
    } else {
      await this.userService.updateUser(user.id, {
        token: moodleToken,
        moodleId: moodleId,
      });
    }

    const tokens = await this.getTokens(
      user.id,
      user.email,
      moodleToken,
      moodleId,
    );
    await this.updateRtHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: string) {
    await this.userService.updateUser(userId, { refreshToken: null });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const rtMatches = await bcrypt.compare(rt, user.refreshToken);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

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

    if (!atSecret || !rtSecret) {
      throw new Error(
        'JWT secrets are not configured. Set AT_SECRET and RT_SECRET environment variables.',
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
