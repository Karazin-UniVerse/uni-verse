import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortByStatus?: string;
}
