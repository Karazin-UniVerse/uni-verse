import { BadRequestException, Injectable } from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import { getWsFunctionName } from '../../utils/wsfunctions';
import {
  normalizeMoodleText,
  extractAcademicYear,
  extractSemester,
} from '../../utils/moodleFilters';
import type { MoodleAssignmentsResponse } from '../../types/Assignment';
import type { MoodleSubmissionStatusResponse } from '../../types/SubmissionStatus';
import type {
  AssignmentItemDto,
  SubmissionStatusDto,
} from './moodle-assignments-dto';

@Injectable()
export class MoodleAssignmentsService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getAssignments(
    moodleToken: string,
    moodleId: string,
  ): Promise<AssignmentItemDto[]> {
    if (!moodleToken || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }
    try {
      const data = await this.moodleClient.client<MoodleAssignmentsResponse>(
        getWsFunctionName('getAssignments'),
        moodleToken,
        undefined,
      );

      const assignments: AssignmentItemDto[] = [];
      data?.courses?.forEach((course) => {
        const year = extractAcademicYear(
          `${course.fullname} ${course.shortname}`,
        );
        const semester =
          extractSemester(course.fullname) ?? extractSemester(course.shortname);

        course.assignments?.forEach((assign) => {
          assignments.push({
            id: assign.id,
            courseName: course.fullname,
            name: assign.name,
            duedate: assign.duedate,
            description: normalizeMoodleText(assign.intro),
            year,
            semester,
          });
        });
      });

      return assignments;
    } catch {
      return [];
    }
  }

  async getSubmissionStatus(
    moodleToken: string,
    moodleId: string,
    assignId: number,
  ): Promise<SubmissionStatusDto> {
    if (!moodleToken || !moodleId) {
      throw new BadRequestException('Token or user ID are not provided');
    }

    const data = await this.moodleClient.client<MoodleSubmissionStatusResponse>(
      getWsFunctionName('getAssignmentSubmissionStatus'),
      moodleToken,
      moodleId,
      { assignid: assignId },
    );

    const submissionStatus = data?.lastattempt?.submission?.status ?? 'new';
    const gradingStatus = data?.lastattempt?.gradingstatus;
    const rawGrade =
      data?.feedback?.grade?.gradefordisplay ?? data?.feedback?.grade?.grade;

    let grade: string | undefined;
    if (rawGrade !== undefined && rawGrade !== null) {
      const num = Number(rawGrade);
      grade = !isNaN(num) ? parseFloat(rawGrade).toString() : rawGrade;
    }

    const finalStatus =
      gradingStatus === 'graded' ? 'graded' : submissionStatus;

    return { status: finalStatus, grade };
  }

  async saveSubmission(
    moodleToken: string,
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<unknown> {
    if (!moodleToken) {
      throw new BadRequestException('Token is not provided');
    }

    const plugindata: Record<string, unknown> = {};

    if (text !== undefined) {
      plugindata['onlinetext_editor'] = { text, format: 1, itemid: 0 };
    }
    if (fileItemId !== undefined) {
      plugindata['files_filemanager'] = fileItemId;
    }

    return this.moodleClient.client(
      getWsFunctionName('saveAssignmentSubmission'),
      moodleToken,
      undefined,
      { assignid: assignId, plugindata },
    );
  }
}
