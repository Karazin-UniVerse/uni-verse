import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';
import type { UpdateMeetingUrlRequest } from '@universe/core/types/timetable';

export class UpdateMeetingUrlDto implements UpdateMeetingUrlRequest {
  @ApiPropertyOptional({ description: 'Online meeting URL', nullable: true })
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  meetingUrl?: string;
}
