import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoodleCoursesDto {
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
  })
  progress?: number;
}
export class MoodleCoursesResponseDto {
  @ApiProperty({
    type: [MoodleCoursesDto],
    description: 'Список курсов пользователя',
  })
  courses: MoodleCoursesDto[];
}
