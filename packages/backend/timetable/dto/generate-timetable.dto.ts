import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { GenerateTimetableRequest } from '@universe/core/types/timetable';

export class GenerateTimetableDto implements GenerateTimetableRequest {
  @ApiPropertyOptional({
    description: 'Maximum candidate solutions to return',
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  maxCandidates?: number;

  @ApiPropertyOptional({
    description: 'Solver timeout in milliseconds',
    minimum: 1,
    maximum: 10000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  timeoutMs?: number;

  @ApiPropertyOptional({
    description:
      'Short semesters: use as few extra Saturdays as possible, mixing classes of different weekdays',
  })
  @IsBoolean()
  @IsOptional()
  compactSaturdays?: boolean;
}
