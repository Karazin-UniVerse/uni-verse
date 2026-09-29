import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID Token from Google Identity Services' })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
