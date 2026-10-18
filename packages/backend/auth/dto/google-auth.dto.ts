import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { GoogleAuthRequest } from '@universe/core/types/auth';

export class GoogleAuthDto implements GoogleAuthRequest {
  @ApiProperty({ description: 'Google ID Token from Google Identity Services' })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
