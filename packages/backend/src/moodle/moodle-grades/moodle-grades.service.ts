import { BadRequestException, Injectable } from '@nestjs/common';
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

      return {
        courseId: item.courseid,
        courseName,
        grade: item.grade || '-',
        rawGrade: item.rawgrade,
        year,
        semester,
      };
    });

    return {
      grades: mappedGrades,
    };
  }
}
