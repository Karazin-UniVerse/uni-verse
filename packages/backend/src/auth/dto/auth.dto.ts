import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or username' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  access_token: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID Token from Google Identity Services' })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

export class LinkMoodleDto {
  @ApiProperty({
    example: 'student.login',
    description: 'Moodle username or email',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: 'Moodle password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class GoogleAuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  access_token: string;

  @ApiProperty({
    example: true,
    description: 'Whether the account is linked to Moodle',
  })
  isLinked: boolean;
}
