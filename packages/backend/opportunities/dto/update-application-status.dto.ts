import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@universe/database';
import type { UpdateApplicationStatusRequest } from '@universe/core/types/opportunities';

export class UpdateApplicationStatusDto implements UpdateApplicationStatusRequest {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  reapplyCount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
