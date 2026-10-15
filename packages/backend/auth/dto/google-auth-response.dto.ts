import { ApiProperty } from '@nestjs/swagger';
import type { GoogleAuthResponse } from '@universe/core/types/auth';

export class GoogleAuthResponseDto implements GoogleAuthResponse {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  access_token: string;

  @ApiProperty({
    example: true,
    description: 'Whether the account is linked to Moodle',
  })
  isLinked: boolean;
}
