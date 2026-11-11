import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { ConfirmTeacherUnavailabilityRequest } from '@universe/core/types/timetable';

export class ConfirmTeacherUnavailabilityDto implements ConfirmTeacherUnavailabilityRequest {
  @ApiProperty({
    description: 'Whether the unavailability request is confirmed',
  })
  @IsBoolean()
  isConfirmed: boolean;

  @ApiPropertyOptional({
    description: 'Optional administrative note or confirmation reason',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
