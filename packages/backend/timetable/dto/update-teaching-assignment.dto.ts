import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import type { UpdateTeachingAssignmentRequest } from '@universe/core/types/timetable';
import { CreateTeachingAssignmentDto } from './create-teaching-assignment.dto';

export class UpdateTeachingAssignmentDto
  extends PartialType(CreateTeachingAssignmentDto, {
    skipNullProperties: false,
  })
  implements UpdateTeachingAssignmentRequest
{
  @ApiPropertyOptional({ description: 'Target academic group ID' })
  @IsString()
  @IsOptional()
  override groupId?: string;

  @ApiPropertyOptional({
    description: 'Online meeting URL',
    maxLength: 2048,
  })
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  override meetingUrl?: string;
}
