import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { CreateTeacherUnavailabilityRequest } from '@universe/core/types/timetable';

export class CreateTeacherUnavailabilityDto implements CreateTeacherUnavailabilityRequest {
  @ApiProperty({
    description: 'Date of unavailability (ISO date string YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be formatted as YYYY-MM-DD',
  })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Pair number (1..7)', minimum: 1, maximum: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  pair: number;

  @ApiPropertyOptional({ description: 'Optional reason for unavailability' })
  @IsString()
  @IsOptional()
  reason?: string;
}
