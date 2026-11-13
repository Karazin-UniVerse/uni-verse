import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RescheduleScope } from '@universe/database';
import {
  FIRST_PAIR,
  LAST_PAIR,
  MAX_RESCHEDULE_REASON_LENGTH,
} from '@universe/core/constants/timetable';
import type { RescheduleEventRequest } from '@universe/core/types/timetable';

export class RescheduleEventDto implements RescheduleEventRequest {
  @ApiProperty({ description: 'ISO date YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  newDate: string;

  @ApiProperty({ minimum: FIRST_PAIR, maximum: LAST_PAIR })
  @IsInt()
  @Min(FIRST_PAIR)
  @Max(LAST_PAIR)
  newPair: number;

  @ApiProperty({ enum: RescheduleScope })
  @IsEnum(RescheduleScope)
  scope: RescheduleScope;

  @ApiProperty({ maxLength: MAX_RESCHEDULE_REASON_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_RESCHEDULE_REASON_LENGTH)
  reason: string;
}
