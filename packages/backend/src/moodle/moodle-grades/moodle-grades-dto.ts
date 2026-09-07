import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ControlType,
  EctsGrade,
  TraditionalGrade,
  StudentRecordBookItem,
} from '@universe/types';

export class MoodleGradeItemDto implements Partial<StudentRecordBookItem> {
  @ApiPropertyOptional({
    example: 101,
    description: 'Унікальний ідентифікатор запису або курсу',
  })
  id?: string | number;

  @ApiProperty({ example: 101, description: 'ID курсу в Moodle' })
  courseId: number;

  @ApiProperty({
    example: "Об'єктно-орієнтоване програмування 2026",
    description: 'Повна назва навчальної дисципліни',
  })
  courseName: string;

  @ApiPropertyOptional({
    example: 'CS101',
    description: 'Код навчальної дисципліни',
  })
  courseCode?: string;

  @ApiPropertyOptional({ example: 4, description: 'Кількість кредитів ECTS' })
  credits?: number;

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

  @ApiProperty({
    example: 95,
    description: 'Підсумковий бал за 100-бальною шкалою (0-100)',
  })
  totalScore: number;

  @ApiPropertyOptional({
    example: 95,
    description: 'Числовий бал (аліас для totalScore)',
  })
  score?: number;

  @ApiProperty({
    example: 'A',
    enum: ['A', 'B', 'C', 'D', 'E', 'Fx', 'F'],
    description: 'Оцінка за шкалою ECTS (A-F)',
  })
  ectsGrade: EctsGrade;

  @ApiProperty({
    example: 'відмінно',
    enum: [
      'відмінно',
      'добре',
      'задовільно',
      'незадовільно',
      'зараховано',
      'не зараховано',
    ],
    description: 'Оцінка за національною шкалою України',
  })
  traditionalGrade: TraditionalGrade;

  @ApiPropertyOptional({
    example: 'exam',
    enum: ['exam', 'credit', 'differentiated_credit'],
    description: 'Форма підсумкового контролю',
  })
  controlType?: ControlType;

  @ApiPropertyOptional({
    example: true,
    description: 'Чи зараховано дисципліну (бал >= 60)',
  })
  isPassed?: boolean;

  @ApiPropertyOptional({
    example: null,
    description: 'Бали за поточний контроль',
  })
  currentScore?: number | null;

  @ApiPropertyOptional({
    example: null,
    description: 'Бали за екзамен',
  })
  examScore?: number | null;

  @ApiPropertyOptional({
    example: '2025/2026',
    description: 'Навчальний рік у форматі YYYY/YYYY (наприклад, 2025/2026)',
  })
  year?: string | null;

  @ApiPropertyOptional({
    example: '2025/2026',
    description: 'Академічний рік у форматі YYYY/YYYY',
  })
  academicYear?: string;

  @ApiPropertyOptional({ example: 2, description: 'Семестр (1 або 2)' })
  semester?: number;
}

export class MoodleGradesResponseDto {
  @ApiProperty({
    type: [MoodleGradeItemDto],
    description: 'Список загальних оцінок за всіма курсами студента',
  })
  grades: MoodleGradeItemDto[];
}
