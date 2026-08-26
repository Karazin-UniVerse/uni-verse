import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoodleGradeItemDto {
  @ApiProperty({ example: 101, description: 'ID курсу в Moodle' })
  courseId: number;

  @ApiProperty({
    example: "Об'єктно-орієнтоване програмування 2026",
    description: 'Повна назва навчальної дисципліни',
  })
  courseName: string;

  @ApiProperty({
    example: '95.00',
    description: 'Оцінка за 100-бальною шкалою або статус зарахування',
  })
  grade: string;

  @ApiProperty({
    example: '95.00000',
    description: 'Неформатований числовий бал',
  })
  rawGrade: string;

  @ApiPropertyOptional({
    example: '2025/2026',
    description: 'Навчальний рік у форматі YYYY/YYYY (наприклад, 2025/2026)',
  })
  year?: string | null;

  @ApiPropertyOptional({ example: 2, description: 'Семестр (1 або 2)' })
  semester?: number | null;
}

export class MoodleGradesResponseDto {
  @ApiProperty({
    type: [MoodleGradeItemDto],
    description: 'Список загальних оцінок за всіма курсами студента',
  })
  grades: MoodleGradeItemDto[];
}
