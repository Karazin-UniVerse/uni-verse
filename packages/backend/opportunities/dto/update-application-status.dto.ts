import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@universe/database';

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
