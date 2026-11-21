import { ApiProperty } from '@nestjs/swagger';
import type { GoogleAuthResponse } from '@universe/core/types/auth';
import { SessionUserDto } from './auth-response.dto';

export class GoogleAuthResponseDto implements GoogleAuthResponse {
  @ApiProperty({
    example: true,
    description: 'Whether the account is linked to Moodle',
  })
  isLinked: boolean;

  @ApiProperty({ type: SessionUserDto })
  user: SessionUserDto;
}
