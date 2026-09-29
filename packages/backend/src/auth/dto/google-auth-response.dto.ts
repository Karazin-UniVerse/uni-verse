import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  access_token: string;

  @ApiProperty({
    example: true,
    description: 'Whether the account is linked to Moodle',
  })
  isLinked: boolean;
}
