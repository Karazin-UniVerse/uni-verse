import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import type { SetAcademicMembershipRequest } from '@universe/core/types/timetable';

export class SetAcademicMembershipDto implements SetAcademicMembershipRequest {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  academicGroupId: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  academicSubgroupId?: string | null;
}
