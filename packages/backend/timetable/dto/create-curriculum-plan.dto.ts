import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { CreateCurriculumPlanRequest } from '@universe/core/types/timetable';

export class CreateCurriculumPlanDto implements CreateCurriculumPlanRequest {
  @ApiProperty({ description: 'Faculty name' })
  @IsString()
  @IsNotEmpty()
  faculty: string;

  @ApiProperty({ description: 'Curriculum plan title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Academic year, e.g. 2026/2027' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({
    description: 'Semester number (1 or 2)',
    minimum: 1,
    maximum: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  semester: number;

  @ApiPropertyOptional({ description: 'Draft status flag', default: true })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}
