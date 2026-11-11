import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { CreateAcademicGroupRequest } from '@universe/core/types/timetable';

export class CreateAcademicGroupDto implements CreateAcademicGroupRequest {
  @ApiProperty({ description: 'Group code, e.g. CS-101' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Degree level, e.g. BACHELOR' })
  @IsString()
  @IsNotEmpty()
  degreeLevel: string;

  @ApiProperty({ description: 'Study form, e.g. FULL_TIME' })
  @IsString()
  @IsNotEmpty()
  studyForm: string;

  @ApiProperty({ description: 'Entry year, e.g. 2026' })
  @Type(() => Number)
  @IsInt()
  entryYear: number;

  @ApiProperty({ description: 'Academic year, e.g. 2026/2027' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ description: 'Subgroup names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subgroups?: string[];
}
