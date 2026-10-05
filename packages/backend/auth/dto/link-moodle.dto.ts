import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkMoodleDto {
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
