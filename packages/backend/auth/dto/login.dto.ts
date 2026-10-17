import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { LoginRequest } from '@universe/core/types/auth';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'user@example.com or username' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
