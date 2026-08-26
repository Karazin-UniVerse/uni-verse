export interface MoodleSubmission {
  id?: number;
  userid?: number;
  attemptnumber?: number;
  timecreated?: number;
  timemodified?: number;
  status: string;
  gradingstatus?: string;
  groupid?: number;
  assignment?: number;
  latest?: boolean;
  plugins?: Array<unknown>;
}

export interface MoodleLastAttempt {
  submission?: MoodleSubmission;
  teamsubmission?: unknown;
  submissiongroup?: unknown;
  submissiongroupmemberswhoneedtosubmit?: Array<unknown>;
  submissionsenabled?: boolean;
  locked?: boolean;
  graded?: boolean;
  canedit?: boolean;
  caneditowner?: boolean;
  cansubmit?: boolean;
  duedatestr?: string;
  duedateelectronicformat?: boolean;
  extensionduedate?: number;
  blindmarking?: boolean;
  gradingstatus: string;
  usergroups?: Array<unknown>;
}

export interface MoodleGradeInfo {
  id?: number;
  userid?: number;
  attemptnumber?: number;
  timecreated?: number;
  timemodified?: number;
  grader?: number;
  grade?: string;
  gradeordisplay?: string;
  gradefordisplay?: string;
}

export interface MoodleFeedback {
  grade?: MoodleGradeInfo;
  gradefordisplay?: string;
  gradeddate?: number | false;
  plugins?: Array<unknown>;
}

export interface MoodleSubmissionStatusResponse {
  assignmentdata?: unknown;
  lastattempt?: MoodleLastAttempt;
  feedback?: MoodleFeedback;
  previousattempts?: Array<unknown>;
  gradingsummary?: unknown;
  warnings?: Array<unknown>;
}
