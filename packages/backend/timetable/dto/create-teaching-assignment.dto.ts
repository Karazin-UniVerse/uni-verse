import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDivisibleBy,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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

  @ApiProperty({
    description: 'Academic hours count',
    minimum: 2,
    maximum: 400,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(400)
  @IsDivisibleBy(2)
  academicHours: number;

  @ApiProperty({ description: 'Assigned teacher user ID' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiPropertyOptional({ description: 'Target academic group ID' })
  @ValidateIf(
    (o: CreateTeachingAssignmentDto) =>
      (!o.subgroupId && !o.streamId) || o.groupId !== undefined,
  )
  @IsString()
  @IsNotEmpty({
    message:
      'At least one of groupId, subgroupId, or streamId must be provided',
  })
  groupId?: string;

  @ApiPropertyOptional({ description: 'Target academic subgroup ID' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subgroupId?: string;

  @ApiPropertyOptional({ description: 'Target academic stream ID' })
  @IsString()
  @IsNotEmpty()
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
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  meetingUrl?: string;
}
