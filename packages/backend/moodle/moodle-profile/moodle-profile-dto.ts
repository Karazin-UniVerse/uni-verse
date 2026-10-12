import type {
  StudentProfile,
  StudentAcademicStatus,
} from '@universe/core/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentProfileDto implements StudentProfile {
  @ApiProperty({ example: 'karazin-student-001' })
  id: string | number;

  @ApiProperty({ example: 4021 })
  moodleId: number | string;

  @ApiProperty({ example: 'Барсуков Родіон Сергійович' })
  fullName: string;

  @ApiProperty({ example: 'rodion.barsukov@karazin.ua' })
  email: string;

  @ApiPropertyOptional({
    example: 'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({ example: 'KB-10293847' })
  studentCardNumber: string;

  @ApiProperty({ example: 'ЗК-2024-042' })
  recordBookNumber: string;

  @ApiProperty({ example: 'ННІ Компʼютерних наук та штучного інтелекту' })
  faculty: string;

  @ApiProperty({
    example: 'Кафедра математичного моделювання та аналізу даних',
  })
  department: string;

  @ApiProperty({ example: '122 Компʼютерні науки' })
  specialty: string;

  @ApiProperty({ example: 'Компʼютерні науки та інтелектуальні системи' })
  educationalProgram: string;

  @ApiProperty({ example: 'bachelor', enum: ['bachelor', 'master', 'phd'] })
  degree: 'bachelor' | 'master' | 'phd';

  @ApiProperty({ example: 3 })
  course: number;

  @ApiProperty({ example: 'КС12' })
  group: string;

  @ApiProperty({ example: 'full-time', enum: ['full-time', 'part-time'] })
  studyForm: 'full-time' | 'part-time';

  @ApiProperty({ example: 'budget', enum: ['budget', 'contract'] })
  financing: 'budget' | 'contract';

  @ApiProperty({
    example: 'active',
    enum: ['active', 'academic_leave', 'expelled', 'graduated'],
  })
  status: StudentAcademicStatus;

  @ApiProperty({ example: 92.4 })
  gpa: number;

  @ApiProperty({ example: 120 })
  totalCreditsEarned: number;

  @ApiProperty({
    example: 'honors',
    enum: ['honors', 'good', 'warning', 'probation'],
  })
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
}
