import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RescheduleScope, RescheduleRequestStatus } from '@universe/database';
import {
  FIRST_PAIR,
  LAST_PAIR,
  MAX_RESCHEDULE_REASON_LENGTH,
  MAX_RESCHEDULE_PAGE_SIZE,
} from '@universe/core/constants/timetable';
import type {
  ListRescheduleRequestsQuery,
  RescheduleProposalInput,
  RejectRescheduleRequest,
} from '@universe/core/types/timetable';

export class RescheduleRequestDto implements RescheduleProposalInput {
  @ApiProperty()
  @IsUUID()
  eventId: string;

  @ApiProperty()
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

export class ListRescheduleRequestsDto implements ListRescheduleRequestsQuery {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_RESCHEDULE_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RESCHEDULE_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({ enum: RescheduleRequestStatus })
  @IsOptional()
  @IsEnum(RescheduleRequestStatus)
  status?: RescheduleRequestStatus;
}

export class RejectRescheduleRequestDto implements RejectRescheduleRequest {
  @ApiProperty({ maxLength: MAX_RESCHEDULE_REASON_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_RESCHEDULE_REASON_LENGTH)
  explanation: string;
}
