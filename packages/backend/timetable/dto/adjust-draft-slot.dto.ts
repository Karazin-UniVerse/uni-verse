import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import type { AdjustDraftSlotRequest } from '@universe/core/types/timetable';

export class AdjustDraftSlotDto implements AdjustDraftSlotRequest {
  @ApiProperty()
  @IsUUID()
  teachingAssignmentId: string;

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  fromWeekday: number;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  fromPair: number;

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  toWeekday: number;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  toPair: number;
}
