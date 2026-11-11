import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import type { GetSemesterCalendarQueryRequest } from '@universe/core/types/timetable';

export class GetSemesterCalendarQueryDto implements GetSemesterCalendarQueryRequest {
  @ApiProperty({ description: 'Academic year (e.g. 2026/2027)' })
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
}
