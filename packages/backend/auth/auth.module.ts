import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { CREDENTIALS_THROTTLE } from '../constants/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AtStrategy } from './strategies/at.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { UserModule } from '../user/user.module';
import { GetCreds } from '../utils/get-creds';
import { MoodleModule } from '../moodle/moodle.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([CREDENTIALS_THROTTLE]),
    UserModule,
    MoodleModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GetCreds, AtStrategy, RtStrategy],
})
export class AuthModule {}
