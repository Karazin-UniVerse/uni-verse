import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDivisibleBy,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TeachingType } from '@universe/database';
import {
  ACADEMIC_HOURS_PER_PAIR,
  MAX_IMPORTED_ASSIGNMENTS,
} from '@universe/core/constants/timetable';
import type {
  ImportCurriculumPlanRequest,
  ImportedTeachingAssignmentRequest,
} from '@universe/core/types/timetable';
import { CreateCurriculumPlanDto } from './create-curriculum-plan.dto';

const MAX_DISCIPLINE_TITLE_LENGTH = 300;

class ImportedTeachingAssignmentDto implements ImportedTeachingAssignmentRequest {
  @ApiProperty({ description: 'Official title of discipline' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_DISCIPLINE_TITLE_LENGTH)
  disciplineTitle: string;

  @ApiProperty({ enum: TeachingType })
  @IsEnum(TeachingType)
  teachingType: TeachingType;

  @ApiProperty({ minimum: ACADEMIC_HOURS_PER_PAIR, maximum: 400 })
  @Type(() => Number)
  @IsInt()
  @Min(ACADEMIC_HOURS_PER_PAIR)
  @Max(400)
  @IsDivisibleBy(ACADEMIC_HOURS_PER_PAIR)
  academicHours: number;
}

export class ImportCurriculumPlanDto
  extends CreateCurriculumPlanDto
  implements ImportCurriculumPlanRequest
{
  @ApiPropertyOptional({
    description: 'Academic group that attends every class',
  })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Stream that attends every class' })
  @IsString()
  @IsOptional()
  streamId?: string;

  @ApiProperty({
    type: [ImportedTeachingAssignmentDto],
    maxItems: MAX_IMPORTED_ASSIGNMENTS,
  })
  @IsArray()
  @IsObject({ each: true })
  @ArrayMaxSize(MAX_IMPORTED_ASSIGNMENTS)
  @ValidateNested({ each: true })
  @Type(() => ImportedTeachingAssignmentDto)
  assignments: ImportedTeachingAssignmentDto[];
}
