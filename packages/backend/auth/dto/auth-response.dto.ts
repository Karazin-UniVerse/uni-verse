import { ApiProperty } from '@nestjs/swagger';
import type { AuthResponse } from '@universe/core/types/auth';

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  access_token: string;
}
