import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, Matches, Max, Min } from 'class-validator';
import type { MakeupSaturdayRequest } from '@universe/core/types/timetable';

export class MakeupSaturdayDto implements MakeupSaturdayRequest {
  @ApiProperty({
    description: 'ISO date string (YYYY-MM-DD) of the makeup Saturday',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be formatted as YYYY-MM-DD',
  })
  @IsDateString({ strict: true })
  date: string;

  @ApiProperty({
    description: 'Weekday (1=Monday .. 5=Friday) whose timetable is followed',
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  followsWeekday: number;
}
