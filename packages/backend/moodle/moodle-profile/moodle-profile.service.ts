import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MoodleClientService,
  type MoodleClientParams,
} from '../moodle-client/moodle.client.service';
import { MoodleCoursesService } from '../moodle-courses/moodle-courses.service';
import { MoodleGradesService } from '../moodle-grades/moodle-grades.service';
import { StudentProfileDto } from './moodle-profile-dto';

interface IMoodleClientService {
  client<T>(params: MoodleClientParams): Promise<T>;
}

interface IMoodleCoursesService {
  getCourses(
    token: string,
    moodleId: string,
  ): Promise<Array<{ id?: number; fullname?: string }>>;
}

interface IMoodleGradesService {
  getGeneralGrades(
    token: string,
    moodleId: string,
  ): Promise<{ grades?: Array<{ grade?: string | number | null }> }>;
}

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

interface MoodleUserGroup {
  id?: number;
  name?: string;
}

interface MoodleCustomField {
  type?: string;
  value?: string;
  name?: string;
  shortname?: string;
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
  groups?: MoodleUserGroup[];
  customfields?: MoodleCustomField[];
}

interface ResolveGroupParams {
  courses: Array<{ id?: number; fullname?: string }>;
  moodleId: string;
  token: string;
  moodleUser?: MoodleUserItem;
}

@Injectable()
export class MoodleProfileService {
  private readonly logger = new Logger(MoodleProfileService.name);

  constructor(
    @Inject(MoodleClientService)
    private readonly moodleClient: IMoodleClientService,
    @Inject(MoodleCoursesService)
    private readonly moodleCoursesService: IMoodleCoursesService,
    @Inject(MoodleGradesService)
    private readonly moodleGradesService: IMoodleGradesService,
  ) {}

  async getProfile(
    moodleToken: string,
    moodleId: string,
    userEmail?: string,
  ): Promise<StudentProfileDto> {
    const siteInfo = await this.fetchSiteInfo(moodleToken);
    const moodleUser = await this.fetchMoodleUser(moodleToken, moodleId);
    const { gpa, totalCredits, courses } = await this.computeAcademicMetrics(
      moodleToken,
      moodleId,
    );

    const fullName = this.resolveFullName(siteInfo, moodleUser);
    const email = this.resolveEmail(siteInfo, moodleUser, userEmail);
    const avatarUrl = this.resolveAvatarUrl(siteInfo, moodleUser);
    const { studentCardNumber, recordBookNumber } = this.resolveIdentifiers(
      moodleUser,
      moodleId,
    );
    const { faculty, department } = this.resolveAffiliation(moodleUser);
    const group = await this.resolveGroup({
      token: moodleToken,
      moodleId,
      moodleUser,
      courses,
    });

    const safeMoodleId = moodleId || '4021';
    const parsedId = Number.parseInt(safeMoodleId, 10);
    const finalMoodleId = Number.isNaN(parsedId) ? 4021 : parsedId;

    return {
      id: `moodle-${safeMoodleId}`,
      moodleId: finalMoodleId,
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
      group,
      studyForm: 'full-time',
      financing: 'budget',
      status: 'active',
      gpa,
      totalCreditsEarned: totalCredits,
      academicStanding: gpa >= 90 ? 'honors' : 'good',
    };
  }

  private async fetchSiteInfo(token: string): Promise<MoodleSiteInfo> {
    try {
      const info = await this.moodleClient.client<MoodleSiteInfo>({
        wsfunction: 'core_webservice_get_site_info',
        moodleToken: token,
      });

      return info || {};
    } catch (err) {
      this.logger.warn(
        `Failed to fetch site info from Moodle: ${(err as Error).message}`,
      );

      return {};
    }
  }

  private async fetchMoodleUser(
    token: string,
    moodleId: string,
  ): Promise<MoodleUserItem | undefined> {
    try {
      const users = await this.moodleClient.client<MoodleUserItem[]>({
        wsfunction: 'core_user_get_users_by_field',
        moodleToken: token,
        moodleId,
        params: {
          field: 'id',
          'values[0]': moodleId,
        },
      });

      if (Array.isArray(users) && users.length > 0) {
        return users[0];
      }
    } catch (err) {
      this.logger.debug(
        `core_user_get_users_by_field not available: ${(err as Error).message}`,
      );
    }

    return undefined;
  }

  private async computeAcademicMetrics(
    token: string,
    moodleId: string,
  ): Promise<{
    gpa: number;
    totalCredits: number;
    courses: Array<{ id?: number; fullname?: string }>;
  }> {
    let gpa = 92.4;
    let totalCredits = 120;
    let coursesList: Array<{ id?: number; fullname?: string }> = [];

    try {
      const [courses, gradesRes] = await Promise.allSettled([
        this.moodleCoursesService.getCourses(token, moodleId),
        this.moodleGradesService.getGeneralGrades(token, moodleId),
      ]);

      if (courses.status === 'fulfilled' && courses.value.length > 0) {
        coursesList = courses.value;
        totalCredits = coursesList.length * 5;
      }

      if (
        gradesRes.status === 'fulfilled' &&
        gradesRes.value.grades &&
        gradesRes.value.grades.length > 0
      ) {
        const calculatedGpa = this.calculateGpaFromGrades(
          gradesRes.value.grades,
        );

        if (calculatedGpa !== null) {
          gpa = calculatedGpa;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to compute GPA/credits from Moodle: ${(err as Error).message}`,
      );
    }

    return { gpa, totalCredits, courses: coursesList };
  }

  private async resolveGroup({
    courses,
    moodleId,
    token,
    moodleUser,
  }: ResolveGroupParams): Promise<string> {
    const directGroup =
      this.resolveGroupFromUserGroups(moodleUser) ||
      this.resolveGroupFromCustomFields(moodleUser) ||
      this.resolveGroupFromDepartment(moodleUser);

    if (directGroup) {
      return directGroup;
    }

    const courseGroup = await this.resolveGroupFromCourses(
      token,
      moodleId,
      courses,
    );

    return courseGroup || '';
  }

  private resolveGroupFromUserGroups(
    moodleUser?: MoodleUserItem,
  ): string | undefined {
    return moodleUser?.groups?.[0]?.name?.trim() || undefined;
  }

  private resolveGroupFromCustomFields(
    moodleUser?: MoodleUserItem,
  ): string | undefined {
    const groupField = moodleUser?.customfields?.find((field) => {
      const shortname = field.shortname?.toLowerCase() || '';
      const name = field.name?.toLowerCase() || '';
      const hasGroupKeyword =
        shortname.includes('group') || name.includes('груп');

      return hasGroupKeyword && Boolean(field.value?.trim());
    });

    return groupField?.value?.trim() || undefined;
  }

  private resolveGroupFromDepartment(
    moodleUser?: MoodleUserItem,
  ): string | undefined {
    const dept = moodleUser?.department?.trim();

    if (
      dept &&
      /^[А-ЯІЇЄа-яіїєA-Za-z]{1,5}[- ]?\d{1,3}[А-ЯІЇЄа-яіїєA-Za-z]?$/.test(dept)
    ) {
      return dept;
    }

    return undefined;
  }

  private async resolveGroupFromCourses(
    token: string,
    moodleId: string,
    courses: Array<{ id?: number; fullname?: string }>,
  ): Promise<string | undefined> {
    for (const course of courses.slice(0, 5)) {
      if (!course.id) {
        continue;
      }

      const groupName = await this.fetchCourseGroup(token, moodleId, course.id);

      if (groupName) {
        return groupName;
      }
    }

    return undefined;
  }

  private async fetchCourseGroup(
    token: string,
    moodleId: string,
    courseId: number,
  ): Promise<string | undefined> {
    try {
      const res = await this.moodleClient.client<{
        groups?: Array<{ id: number; name: string }>;
      }>({
        wsfunction: 'core_group_get_course_user_groups',
        moodleToken: token,
        params: {
          courseid: courseId,
          userid: moodleId,
        },
      });

      return res?.groups?.[0]?.name?.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  private calculateGpaFromGrades(
    grades: Array<{ grade?: string | number | null }>,
  ): number | null {
    const scores = grades
      .map((item) => Number.parseFloat(String(item.grade ?? '0')))
      .filter((score) => !Number.isNaN(score) && score > 0);

    if (scores.length === 0) {
      return null;
    }

    const sum = scores.reduce((acc, score) => acc + score, 0);

    return Math.round((sum / scores.length) * 10) / 10;
  }

  private resolveFullName(
    siteInfo?: MoodleSiteInfo,
    moodleUser?: MoodleUserItem,
  ): string {
    if (siteInfo?.fullname) {
      return siteInfo.fullname;
    }

    if (moodleUser?.fullname) {
      return moodleUser.fullname;
    }

    if (siteInfo?.firstname && siteInfo?.lastname) {
      return `${siteInfo.lastname} ${siteInfo.firstname}`;
    }

    return 'Барсуков Родіон Сергійович';
  }

  private resolveEmail(
    siteInfo?: MoodleSiteInfo,
    moodleUser?: MoodleUserItem,
    userEmail?: string,
  ): string {
    if (moodleUser?.email) {
      return moodleUser.email;
    }

    if (userEmail) {
      return userEmail;
    }

    if (siteInfo?.username) {
      return `${siteInfo.username}@student.karazin.ua`;
    }

    return 'student@karazin.ua';
  }

  private resolveAvatarUrl(
    siteInfo?: MoodleSiteInfo,
    moodleUser?: MoodleUserItem,
  ): string {
    if (siteInfo?.userpictureurl) {
      return siteInfo.userpictureurl;
    }

    if (moodleUser?.profileimageurl) {
      return moodleUser.profileimageurl;
    }

    return 'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg';
  }

  private resolveIdentifiers(
    moodleUser: MoodleUserItem | undefined,
    moodleId: string,
  ): { studentCardNumber: string; recordBookNumber: string } {
    const idNumber = moodleUser?.idnumber;
    const fallbackId = moodleId || '10293847';
    const fallbackSuffix = moodleId ? moodleId.slice(-3) : '042';

    return {
      studentCardNumber: idNumber ?? `КВ-${fallbackId.padStart(8, '0')}`,
      recordBookNumber: idNumber
        ? `ЗК-${idNumber}`
        : `ЗК-2024-${fallbackSuffix}`,
    };
  }

  private resolveAffiliation(moodleUser?: MoodleUserItem): {
    faculty: string;
    department: string;
  } {
    return {
      faculty:
        moodleUser?.institution ||
        moodleUser?.department ||
        'ННІ Компʼютерних наук та штучного інтелекту',
      department:
        moodleUser?.department ||
        'Кафедра математичного моделювання та аналізу даних',
    };
  }
}
