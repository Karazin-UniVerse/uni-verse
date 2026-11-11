import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import type { UpdateMeetingUrlRequest } from '@universe/core/types/timetable';

export class UpdateMeetingUrlDto implements UpdateMeetingUrlRequest {
  @ApiPropertyOptional({ description: 'Online meeting URL', nullable: true })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  meetingUrl?: string;
}
