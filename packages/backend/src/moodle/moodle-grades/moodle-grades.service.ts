import { BadRequestException, Injectable } from '@nestjs/common';
import {
  calculateEctsGrade,
  calculateTraditionalGrade,
  type ControlType,
} from '@universe/types';
import { getWsFunctionName } from '../../utils/wsfunctions';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import {
  extractAcademicYear,
  extractSemester,
} from '../../utils/moodleFilters';
import type { Course } from '../../types/Course';
import type { GeneralGrade } from '../../types/GeneralGrade';
import {
  MoodleGradeItemDto,
  MoodleGradesResponseDto,
} from './moodle-grades-dto';

interface MoodleOverviewGradesResponse {
  grades: GeneralGrade[];
  warnings?: Array<unknown>;
}

export function parseGradeScore(
  rawGrade?: string | number | null,
  grade?: string | null,
): number {
  const tryParse = (val?: string | number | null): number | null => {
    if (val === undefined || val === null) {
      return null;
    }

    const str = String(val).trim().replace(',', '.');

    if (str === '' || str === '-') {
      return null;
    }

    const num = parseFloat(str);

    if (!isNaN(num) && isFinite(num)) {
      return Math.min(100, Math.max(0, Math.round(num * 100) / 100));
    }

    return null;
  };

  const parsedRaw = tryParse(rawGrade);

  if (parsedRaw !== null) {
    return parsedRaw;
  }

  const parsedGrade = tryParse(grade);

  if (parsedGrade !== null) {
    return parsedGrade;
  }

  return 0;
}

export function detectControlType(
  courseName?: string,
  shortname?: string,
): ControlType {
  const text = `${courseName || ''} ${shortname || ''}`.toLowerCase();

  if (text.includes('диф') || text.includes('differentiated')) {
    return 'differentiated_credit';
  }

  if (
    text.includes('залік') ||
    text.includes('credit') ||
    text.includes('зачет')
  ) {
    return 'credit';
  }

  return 'exam';
}

@Injectable()
export class MoodleGradesService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getGeneralGrades(
    token: string,
    moodleId: string,
  ): Promise<MoodleGradesResponseDto> {
    if (!token || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }

    const [gradesResponse, coursesData] = await Promise.all([
      this.moodleClient
        .client<MoodleOverviewGradesResponse>(
          getWsFunctionName('getGrades'),
          token,
          moodleId,
        )
        .catch(() => ({ grades: [] }) as MoodleOverviewGradesResponse),
      this.moodleClient
        .client<Course[]>(getWsFunctionName('getCourses'), token, moodleId)
        .catch(() => [] as Course[]),
    ]);

    const rawGrades = gradesResponse?.grades || [];
    const courseMap = new Map<number, Course>();

    if (Array.isArray(coursesData)) {
      coursesData.forEach((course) => courseMap.set(course.id, course));
    }

    const mappedGrades: MoodleGradeItemDto[] = rawGrades.map((item) => {
      const course = courseMap.get(item.courseid);
      const courseName = course?.fullname || `Курс ID ${item.courseid}`;
      const year = course
        ? extractAcademicYear(
            `${course.fullname} ${course.shortname || ''}`,
            course.startdate,
          )
        : null;
      const semester = course
        ? extractSemester(course.fullname) ||
          extractSemester(course.shortname || '')
        : null;

      const controlType = detectControlType(
        course?.fullname,
        course?.shortname,
      );
      const totalScore = parseGradeScore(item.rawgrade, item.grade);
      const ectsGrade = calculateEctsGrade(totalScore);
      const traditionalGrade = calculateTraditionalGrade(
        totalScore,
        controlType,
      );
      const isPassed = totalScore >= 60;

      return {
        id: item.courseid,
        courseId: item.courseid,
        courseName,
        courseCode: course?.shortname,
        credits: 4,
        grade: item.grade || '-',
        rawGrade: item.rawgrade,
        totalScore,
        score: totalScore,
        ectsGrade,
        traditionalGrade,
        controlType,
        isPassed,
        currentScore: null,
        examScore: null,
        year,
        academicYear: year || '2025/2026',
        semester: semester ?? 1,
      };
    });

    return {
      grades: mappedGrades,
    };
  }
}
