/**
 * Current enrollment lifecycle status.
 */
export type StudentAcademicStatus = 'active' | 'academic_leave' | 'expelled' | 'graduated';

/**
 * Complete student profile model for the E-Dean's office
 */
export interface StudentProfile {
  id: string | number;
  moodleId: number | string;
  fullName: string;
  email: string;
  studentCardNumber: string;
  recordBookNumber: string;
  faculty: string;
  department: string;
  specialty: string;
  educationalProgram: string;
  degree: 'bachelor' | 'master' | 'phd';
  studyForm: 'full-time' | 'part-time';
  financing: 'budget' | 'contract';
  status: StudentAcademicStatus;
  gpa: number;
  totalCreditsEarned: number;
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
  /** Year of study. Absent until a real academic data source exists. */
  course?: number;
  /** Academic group (e.g. «КС12»). Absent until a real academic data source exists. */
  group?: string;
  avatarUrl?: string;
}
