import { ApiProperty } from '@nestjs/swagger';
import type { LogoutResponse } from '@universe/core/types/auth';

export class LogoutResponseDto implements LogoutResponse {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}
