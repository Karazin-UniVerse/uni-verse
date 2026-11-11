import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import type { ListTeachingAssignmentsQueryRequest } from '@universe/core/types/timetable';

export class ListTeachingAssignmentsQueryDto implements ListTeachingAssignmentsQueryRequest {
  @ApiProperty({ description: 'Curriculum plan UUID' })
  @IsUUID()
  @IsNotEmpty()
  curriculumPlanId: string;
}
