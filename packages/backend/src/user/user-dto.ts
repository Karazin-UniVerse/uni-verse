import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Moodle ID is required' })
  moodleId: string;
}

export class UpdateUserDto {
  @ApiProperty()
  moodleId: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  refreshToken: string | null;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty({ nullable: true })
  moodleId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
