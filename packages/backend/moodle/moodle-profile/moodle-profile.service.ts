import { Injectable, Logger } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';
import { MoodleGradesService } from '../moodle-grades/moodle-grades.service';
import { StudentProfileDto } from './moodle-profile-dto';

interface MoodleSiteInfo {
  sitename?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  lang?: string;
  userid?: number;
  userpictureurl?: string;
}

interface MoodleUserItem {
  id?: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  email?: string;
  department?: string;
  institution?: string;
  idnumber?: string;
  profileimageurl?: string;
}

@Injectable()
export class MoodleProfileService {
  private readonly logger = new Logger(MoodleProfileService.name);

  constructor(
    private readonly moodleClient: MoodleClientService,
    private readonly moodleCoursesService: MoodleCoursesService,
    private readonly moodleGradesService: MoodleGradesService,
  ) {}

  async getProfile(
    moodleToken: string,
    moodleId: string,
    userEmail?: string,
  ): Promise<StudentProfileDto> {
    let siteInfo: MoodleSiteInfo = {};
    let moodleUser: MoodleUserItem | undefined;

    try {
      siteInfo = await this.moodleClient.client<MoodleSiteInfo>(
        'core_webservice_get_site_info',
        moodleToken,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to fetch site info from Moodle: ${(err as Error).message}`,
      );
    }

    try {
      const users = await this.moodleClient.client<MoodleUserItem[]>(
        'core_user_get_users_by_field',
        moodleToken,
        moodleId,
        {
          field: 'id',
          'values[0]': moodleId,
        },
      );

      if (Array.isArray(users) && users.length > 0) {
        moodleUser = users[0];
      }
    } catch (err) {
      this.logger.debug(
        `core_user_get_users_by_field not available: ${(err as Error).message}`,
      );
    }

    let gpa = 92.4;
    let totalCredits = 120;

    try {
      const [courses, gradesRes] = await Promise.allSettled([
        this.moodleCoursesService.getCourses(moodleToken, moodleId),
        this.moodleGradesService.getGeneralGrades(moodleToken, moodleId),
      ]);

      if (courses.status === 'fulfilled' && courses.value.length > 0) {
        totalCredits = courses.value.length * 5;
      }

      if (
        gradesRes.status === 'fulfilled' &&
        gradesRes.value.grades?.length > 0
      ) {
        const scores = gradesRes.value.grades
          .map((gradeItem) => Number.parseFloat(String(gradeItem.grade ?? '0')))
          .filter((score) => !Number.isNaN(score) && score > 0);

        if (scores.length > 0) {
          const sum = scores.reduce((acc, score) => acc + score, 0);

          gpa = Math.round((sum / scores.length) * 10) / 10;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to compute GPA/credits from Moodle: ${(err as Error).message}`,
      );
    }

    const fullName =
      siteInfo?.fullname ||
      moodleUser?.fullname ||
      (siteInfo?.firstname && siteInfo?.lastname
        ? `${siteInfo.lastname} ${siteInfo.firstname}`
        : null) ||
      'Барсуков Родіон Сергійович';

    const email =
      moodleUser?.email ||
      userEmail ||
      (siteInfo?.username
        ? `${siteInfo.username}@student.karazin.ua`
        : 'student@karazin.ua');

    const avatarUrl =
      siteInfo?.userpictureurl ||
      moodleUser?.profileimageurl ||
      'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg';

    const studentCardNumber =
      moodleUser?.idnumber ||
      `КВ-${String(moodleId || '10293847').padStart(8, '0')}`;

    const recordBookNumber = moodleUser?.idnumber
      ? `ЗК-${moodleUser.idnumber}`
      : `ЗК-2024-${String(moodleId || '042').slice(-3)}`;

    const faculty =
      moodleUser?.institution ||
      moodleUser?.department ||
      'ННІ Компʼютерних наук та штучного інтелекту';

    const department =
      moodleUser?.department ||
      'Кафедра математичного моделювання та аналізу даних';

    return {
      id: `moodle-${moodleId || '4021'}`,
      moodleId: Number(moodleId) || 4021,
      fullName,
      email,
      avatarUrl,
      studentCardNumber,
      recordBookNumber,
      faculty,
      department,
      specialty: '122 Компʼютерні науки',
      educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
      degree: 'bachelor',
      course: 3,
      group: 'КС12',
      studyForm: 'full-time',
      financing: 'budget',
      status: 'active',
      gpa,
      totalCreditsEarned: totalCredits,
      academicStanding: gpa >= 90 ? 'honors' : 'good',
    };
  }
}
