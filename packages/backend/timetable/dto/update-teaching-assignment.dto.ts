import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import type { UpdateTeachingAssignmentRequest } from '@universe/core/types/timetable';
import { CreateTeachingAssignmentDto } from './create-teaching-assignment.dto';

export class UpdateTeachingAssignmentDto
  extends PartialType(CreateTeachingAssignmentDto, {
    skipNullProperties: false,
  })
  implements UpdateTeachingAssignmentRequest
{
  @ApiPropertyOptional({ description: 'Online meeting URL' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  override meetingUrl?: string;
}
