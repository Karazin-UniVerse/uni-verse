import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import type { GenerateTimetableRequest } from '@universe/core/types/timetable';

export class GenerateTimetableDto implements GenerateTimetableRequest {
  @ApiPropertyOptional({
    description: 'Maximum candidate solutions to return',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxCandidates?: number;

  @ApiPropertyOptional({
    description: 'Solver timeout in milliseconds',
    minimum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @IsOptional()
  timeoutMs?: number;
}
