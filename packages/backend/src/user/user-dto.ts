import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Name is required' })
  token: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Name is required' })
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
