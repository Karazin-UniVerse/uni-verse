import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import type { CreateTeachingAssignmentRequest } from '@universe/core/types/timetable';
import { TeachingType } from '@universe/database';

export class CreateTeachingAssignmentDto implements CreateTeachingAssignmentRequest {
  @ApiProperty({ description: 'Curriculum plan ID' })
  @IsString()
  @IsNotEmpty()
  curriculumPlanId: string;

  @ApiProperty({ description: 'Official title of discipline' })
  @IsString()
  @IsNotEmpty()
  disciplineTitle: string;

  @ApiProperty({ enum: TeachingType, description: 'Type of teaching' })
  @IsEnum(TeachingType)
  teachingType: TeachingType;

  @ApiProperty({ description: 'Academic hours count', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicHours: number;

  @ApiProperty({ description: 'Assigned teacher user ID' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiPropertyOptional({ description: 'Target academic group ID' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Target academic subgroup ID' })
  @IsString()
  @IsOptional()
  subgroupId?: string;

  @ApiPropertyOptional({ description: 'Target academic stream ID' })
  @IsString()
  @IsOptional()
  streamId?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether the discipline is Saturday-only',
  })
  @IsBoolean()
  @IsOptional()
  isSaturdayOnly?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Authorized for late evening slots',
  })
  @IsBoolean()
  @IsOptional()
  hasLateSlotAuthorization?: boolean;

  @ApiPropertyOptional({ description: 'Online meeting URL' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  meetingUrl?: string;
}
