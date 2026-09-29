import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SaveSubmissionDto {
  @ApiPropertyOptional({
    example: 'My answer text',
    description: 'Online text submission',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    example: 12345,
    description: 'File item ID from draft area upload',
  })
  @IsOptional()
  @IsNumber()
  fileItemId?: number;
}

export class AssignmentItemDto {
  @ApiProperty({ example: 1, description: 'Assignment ID' })
  id: number;

  @ApiProperty({ example: 'Algorithms course', description: 'Course name' })
  courseName: string;

  @ApiProperty({ example: 'Lab 1', description: 'Assignment name' })
  name: string;

  @ApiProperty({
    example: 1672531200,
    description: 'Due date as unix timestamp',
  })
  duedate: number;

  @ApiPropertyOptional({
    example: 'Submit your work',
    description: 'Assignment description',
  })
  description?: string;

  @ApiPropertyOptional({ example: '2025/2026', description: 'Academic year' })
  year?: string | null;

  @ApiPropertyOptional({ example: 2, description: 'Semester number' })
  semester?: number | null;

  @ApiPropertyOptional({
    example: 'submitted',
    description: 'Submission status (new, draft, submitted, graded)',
  })
  @IsOptional()
  @IsString()
  submissionStatus?: string;

  @ApiPropertyOptional({
    example: '95.00',
    description: 'Grade if already graded',
  })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether assignment is graded',
  })
  @IsOptional()
  @IsBoolean()
  graded?: boolean;
  @ApiPropertyOptional({
    example: 1727000000,
    description: 'Submission timestamp if submitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  submittedAt?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether assignment was submitted after deadline',
  })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;
}

export class SubmissionStatusDto {
  @ApiProperty({
    example: 'submitted',
    description: 'Submission status (new, draft, submitted, graded)',
  })
  status: string;

  @ApiPropertyOptional({
    example: '95.00',
    description: 'Grade if already graded',
  })
  grade?: string;

  @ApiPropertyOptional({
    example: 1727000000,
    description: 'Submission timestamp',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  submittedAt?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether assignment was submitted after deadline',
  })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;
}

function parseBooleanQuery(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  return value;
}

export class GetAssignmentsQueryDto {
  @ApiPropertyOptional({ enum: ['completed', 'not_completed'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2025/2026' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortByDate?: string;

  @ApiPropertyOptional({ example: 1672531200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dateFrom?: number;

  @ApiPropertyOptional({ example: 1704067200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dateTo?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Include submission status and grade',
  })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  includeStatus?: boolean;
}
