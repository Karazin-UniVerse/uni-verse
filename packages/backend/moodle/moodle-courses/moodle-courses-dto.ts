import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MoodleCourse } from '@universe/core/types/moodle';

export class MoodleCoursesDto implements MoodleCourse {
  @ApiProperty({ example: 101, description: 'ID курса в Moodle' })
  id: number;

  @ApiProperty({
    example: 'Высшая математика 2026',
    description: 'Полное название курса',
  })
  fullname: string;

  @ApiPropertyOptional({
    example: 'Math-101',
    description: 'Короткое название курса',
  })
  shortname?: string;

  @ApiPropertyOptional({
    example: 85.5,
    description: 'Прогресс выполнения (в процентах)',
    nullable: true,
  })
  progress?: number | null;
}
export class MoodleCoursesResponseDto {
  @ApiProperty({
    type: [MoodleCoursesDto],
    description: 'Список курсов пользователя',
  })
  courses: MoodleCoursesDto[];
}
