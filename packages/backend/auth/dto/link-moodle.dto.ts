import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { LinkMoodleRequest } from '@universe/core/types/auth';

export class LinkMoodleDto implements LinkMoodleRequest {
  @ApiProperty({
    example: 'student.login',
    description: 'Moodle username or email',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: 'Moodle password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
