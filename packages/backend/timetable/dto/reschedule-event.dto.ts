import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { RescheduleEventRequest } from '@universe/core/types/timetable';

export class RescheduleEventDto implements RescheduleEventRequest {
  @ApiProperty({ description: 'ISO date YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  newDate: string;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  newPair: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
