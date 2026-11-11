import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CreateSemesterCalendarRequest } from '@universe/core/types/timetable';
import { MakeupSaturdayDto } from './makeup-saturday.dto';

export class CreateSemesterCalendarDto implements CreateSemesterCalendarRequest {
  @ApiProperty({ description: 'Academic year, e.g. 2026/2027' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ description: 'Semester (1 or 2)', minimum: 1, maximum: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  semester: number;

  @ApiProperty({
    description: 'Semester start date (ISO date string YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be formatted as YYYY-MM-DD',
  })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiProperty({ description: 'Number of teaching weeks', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teachingWeeks: number;

  @ApiPropertyOptional({
    description: 'List of excluded dates (ISO date strings)',
    type: [String],
    default: [],
  })
  @IsArray()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    each: true,
    message: 'Date must be formatted as YYYY-MM-DD',
  })
  @IsDateString({ strict: true }, { each: true })
  @IsOptional()
  excludedDates?: string[];

  @ApiPropertyOptional({
    description: 'Makeup Saturdays configuration',
    type: [MakeupSaturdayDto],
    default: [],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MakeupSaturdayDto)
  @IsOptional()
  makeupSaturdays?: MakeupSaturdayDto[];
}
