import { ApiProperty } from '@nestjs/swagger';
import type { GripSessionResponse } from '@universe/core/types/grip';

export class GripSessionResponseDto implements GripSessionResponse {
  @ApiProperty()
  token: string;

  @ApiProperty()
  expiresAt: string;
}
