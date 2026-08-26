export interface MoodleAssignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  nosubmissions: number;
  submissiondrafts: number;
  sendnotifications: number;
  sendlatenotifications: number;
  sendstudentnotifications: number;
  duedate: number;
  allowsubmissionsfromdate: number;
  grade: number;
  timemodified: number;
  completionsubmit: number;
  cutoffdate: number;
  gradingduedate: number;
  teamsubmission: number;
  requireallteammemberssubmit: number;
  teamsubmissiongroupingid: number;
  blindmarking: number;
  hidegrader: number;
  revealidentities: number;
  attemptreopenmethod: string;
  maxattempts: number;
  markingworkflow: number;
  markingallocation: number;
  requiresubmissionstatement: number;
  preventsubmissionnotingroup: number;
  configs: Array<unknown>;
  intro?: string;
  introformat?: number;
  introfiles?: Array<unknown>;
  introattachments?: Array<unknown>;
}

export interface MoodleAssignmentCourse {
  id: number;
  fullname: string;
  shortname: string;
  timemodified: number;
  assignments: MoodleAssignment[];
}

export interface MoodleAssignmentsResponse {
  courses: MoodleAssignmentCourse[];
  warnings?: Array<unknown>;
}
