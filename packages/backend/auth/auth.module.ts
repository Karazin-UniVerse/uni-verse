import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AtStrategy } from './strategies/at.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { UserModule } from '../user/user.module';
import { GetCreds } from '../utils/get-creds';

@Module({
  imports: [PassportModule, JwtModule.register({}), UserModule],
  controllers: [AuthController],
  providers: [AuthService, GetCreds, AtStrategy, RtStrategy],
})
export class AuthModule {}
