import type { StudentProfile } from '@core/types/student';

export const fallbackStudentProfile: StudentProfile = {
  id: 'test-student',
  moodleId: 1,
  fullName: 'Test Student',
  email: 'student@example.com',
  studentCardNumber: 'TEST-001',
  recordBookNumber: 'TEST-002',
  faculty: 'Test Faculty',
  department: 'Test Department',
  specialty: 'Computer Science',
  educationalProgram: 'Computer Science',
  degree: 'bachelor',
  studyForm: 'full-time',
  financing: 'budget',
  status: 'active',
  gpa: 92.4,
  totalCreditsEarned: 120,
  academicStanding: 'honors',
};
