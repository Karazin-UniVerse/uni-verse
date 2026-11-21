import { ApiProperty } from '@nestjs/swagger';
import type { AuthResponse, SessionUser } from '@universe/core/types/auth';

export class SessionUserDto implements SessionUser {
  @ApiProperty({ example: 'user-uuid-123' })
  id: string;

  @ApiProperty({ example: 'student@karazin.ua' })
  email: string;

  @ApiProperty({ example: 'Іван Петренко', nullable: true })
  name: string | null;

  @ApiProperty({ example: ['OPPORTUNITIES_USER'], type: [String] })
  roles: string[];

  @ApiProperty({ example: true })
  isLinked: boolean;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ type: SessionUserDto })
  user: SessionUserDto;
}
