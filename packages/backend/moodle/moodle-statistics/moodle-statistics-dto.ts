import { ApiProperty } from '@nestjs/swagger';
import type { CourseStatistics } from '@universe/core/types/moodle';

export class StatisticsDto implements CourseStatistics {
  @ApiProperty({ example: 15, description: 'Total number of enrolled courses' })
  total: number;
}
