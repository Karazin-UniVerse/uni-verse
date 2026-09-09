/**
 * @universe/types
 * Core domain models, shared contracts, and grade calculation utilities
 * for the Karazin UniVerse platform (UniHub, NestJS Gateway, Moodle LMS).
 */

/** ECTS Grade scale (European Credit Transfer and Accumulation System) */
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';

/** Traditional Ukrainian national grading scale */
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';

/** Final control types in higher education curriculum */
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';

/** Academic status of a student */
export type StudentAcademicStatus = 'active' | 'academic_leave' | 'expelled' | 'graduated';

/** Submission workflow status for academic assignments */
export type AssignmentSubmissionStatus = 'new' | 'draft' | 'submitted' | 'graded' | 'overdue';

/** Types of academic schedule events */
export type ScheduleEventType =
  'lecture' | 'lab' | 'practice' | 'seminar' | 'consultation' | 'exam';

/**
 * Complete student profile model for the E-Dean's office
 */
export interface StudentProfile {
  id: string | number;
  moodleId: number | string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardNumber: string;
  recordBookNumber: string;
  faculty: string;
  department: string;
  specialty: string;
  educationalProgram: string;
  degree: 'bachelor' | 'master' | 'phd';
  course: number;
  group: string;
  studyForm: 'full-time' | 'part-time';
  financing: 'budget' | 'contract';
  status: StudentAcademicStatus;
  gpa: number;
  totalCreditsEarned: number;
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
}

/**
 * Curriculum course item within the individual academic plan
 */
export interface CurriculumItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  fullname?: string;
  shortname?: string;
  description?: string;
  credits: number;
  semester: number;
  academicYear: string;
  cycle?: 'general' | 'professional' | 'elective';
  controlType: ControlType;
  instructors: Array<{
    id?: number | string;
    name: string;
    email?: string;
    role?: string;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  moodleCourseId?: number;
  moodleUrl?: string;
  hours?: {
    total: number;
    lectures: number;
    practicals: number;
    labs: number;
    selfStudy: number;
  };
}

/**
 * Canonical alias for CurriculumItem
 */
export type Course = CurriculumItem;

/**
 * Single grade record entry in the student digital gradebook (StudentRecordBook)
 */
export interface StudentRecordBookItem {
  id: string | number;
  courseId: number;
  courseName: string;
  courseCode?: string;
  credits?: number;
  semester?: number;
  academicYear?: string;
  controlType?: ControlType;
  currentScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  ectsGrade?: EctsGrade | null;
  traditionalGrade?: TraditionalGrade | null;
  date?: string;
  instructorName?: string;
  isPassed?: boolean | null;
  rawGrade?: string | number | null;
}

/**
 * Canonical alias for StudentRecordBookItem
 */
export type GradeRecord = StudentRecordBookItem;

/**
 * Academic assignment item with deadlines, feedback, and submission tracking
 */
export interface AssignmentItem {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description?: string;
  duedate: number;
  submissionStatus: AssignmentSubmissionStatus;
  gradingStatus?: 'not_graded' | 'graded';
  grade?: string | number | null;
  maxGrade?: number;
  feedback?: string;
  year?: string | null;
  semester?: number | null;
  duedateIso?: string;
  attachments?: Array<{ name: string; url: string; size?: number }>;
}

/**
 * Academic timetable item for schedule grid views
 */
export interface ScheduleItem {
  id: string | number;
  courseId?: number;
  title: string;
  type: ScheduleEventType;
  instructor: string;
  location: string;
  onlineLink?: string;
  startTime: string;
  endTime: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekType?: 'all' | 'numerator' | 'denominator';
  date?: string;
}

/**
 * LMS Moodle connection and synchronization status model
 */
export interface LmsConnectionStatus {
  host: string;
  isConnected: boolean;
  status: 'online' | 'offline' | 'degraded' | 'syncing';
  lastSyncTimestamp: number | string;
  latencyMs?: number;
  userId?: string | number;
  userTokenValid: boolean;
}

/**
 * Calculates the ECTS letter grade based on a 100-point scale:
 * - >= 90: 'A'
 * - >= 82: 'B'
 * - >= 74: 'C'
 * - >= 64: 'D'
 * - >= 60: 'E'
 * - >= 35: 'Fx'
 * - < 35: 'F'
 */
export function calculateEctsGrade(score: number): EctsGrade {
  if (score >= 90) {
    return 'A';
  }

  if (score >= 82) {
    return 'B';
  }

  if (score >= 74) {
    return 'C';
  }

  if (score >= 64) {
    return 'D';
  }

  if (score >= 60) {
    return 'E';
  }

  if (score >= 35) {
    return 'Fx';
  }

  return 'F';
}

/**
 * Calculates the traditional Ukrainian national grade based on score and control type:
 * - For credit ('credit'):
 *   - >= 60: 'зараховано'
 *   - < 60: 'не зараховано'
 * - For exam ('exam') and differentiated credit ('differentiated_credit'):
 *   - >= 90: 'відмінно'
 *   - >= 74: 'добре'
 *   - >= 60: 'задовільно'
 *   - < 60: 'незадовільно'
 */
export function calculateTraditionalGrade(
  score: number,
  controlType: ControlType = 'exam',
): TraditionalGrade {
  if (controlType === 'credit') {
    return score >= 60 ? 'зараховано' : 'не зараховано';
  }

  if (score >= 90) {
    return 'відмінно';
  }

  if (score >= 74) {
    return 'добре';
  }

  if (score >= 60) {
    return 'задовільно';
  }

  return 'незадовільно';
}

/**
 * Canonical fallback student profile (Rodion Barsukov)
 */
export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  id: 'karazin-student-001',
  moodleId: 3,
  fullName: 'Барсуков Родіон Сергійович',
  email: 'barsukov.rodion@student.karazin.ua',
  avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/3/f1.jpg',
  studentCardNumber: 'KB-10293847',
  recordBookNumber: 'ЗК-2024-042',
  faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
  department: 'Кафедра математичного моделювання та аналізу даних',
  specialty: '122 Компʼютерні науки',
  educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
  degree: 'bachelor',
  course: 3,
  group: 'КС12',
  studyForm: 'full-time',
  financing: 'budget',
  status: 'active',
  gpa: 92.4,
  totalCreditsEarned: 120,
  academicStanding: 'honors',
};

/**
 * Authentic pseudo-real Dean profiles for all registered Moodle accounts
 */
export const KNOWN_STUDENT_PROFILES: StudentProfile[] = [
  DEFAULT_STUDENT_PROFILE,
  {
    id: 'karazin-student-118',
    moodleId: 118,
    fullName: 'Мельник Богдан Олександрович',
    email: 'melnyk.bogdan@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/118/f1.jpg',
    studentCardNumber: 'KB-22019481',
    recordBookNumber: 'ЗК-2025-118',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра компʼютерних систем та мереж',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: 2,
    group: 'КС-22',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 88.6,
    totalCreditsEarned: 60,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-119',
    moodleId: 119,
    fullName: 'Коваленко Анастасія Ігорівна',
    email: 'kovalenko.anastasia@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/119/f1.jpg',
    studentCardNumber: 'KB-22019482',
    recordBookNumber: 'ЗК-2025-119',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра штучного інтелекту та програмних систем',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Інформатика та штучний інтелект',
    degree: 'bachelor',
    course: 2,
    group: 'КС-22',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 94.6,
    totalCreditsEarned: 60,
    academicStanding: 'honors',
  },
  {
    id: 'karazin-student-120',
    moodleId: 120,
    fullName: 'Шевченко Максим Віталійович',
    email: 'shevchenko.maksym@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/120/f1.jpg',
    studentCardNumber: 'KB-23018274',
    recordBookNumber: 'ЗК-2026-120',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра теоретичної та прикладної інформатики',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки',
    degree: 'bachelor',
    course: 1,
    group: 'КС-11',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 84.5,
    totalCreditsEarned: 30,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-121',
    moodleId: 121,
    fullName: 'Бондаренко Софія Андріївна',
    email: 'bondarenko.sofiya@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/121/f1.jpg',
    studentCardNumber: 'KB-23018275',
    recordBookNumber: 'ЗК-2026-121',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра безпеки інформаційних систем і технологій',
    specialty: '125 Кібербезпека та захист інформації',
    educationalProgram: 'Безпека інформаційних і комунікаційних систем',
    degree: 'bachelor',
    course: 1,
    group: 'КБ-11',
    studyForm: 'full-time',
    financing: 'contract',
    status: 'active',
    gpa: 89.2,
    totalCreditsEarned: 30,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-122',
    moodleId: 122,
    fullName: 'Кравченко Данило Юрійович',
    email: 'kravchenko.danylo@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/122/f1.jpg',
    studentCardNumber: 'KB-22019483',
    recordBookNumber: 'ЗК-2025-122',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра штучного інтелекту та програмних систем',
    specialty: '121 Інженерія програмного забезпечення',
    educationalProgram: 'Програмна інженерія',
    degree: 'bachelor',
    course: 2,
    group: 'ПІ-21',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 86.4,
    totalCreditsEarned: 60,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-123',
    moodleId: 123,
    fullName: 'Мороз Владислав Сергійович',
    email: 'moroz.vladyslav@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/123/f1.jpg',
    studentCardNumber: 'KB-23018276',
    recordBookNumber: 'ЗК-2026-123',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра теоретичної та прикладної інформатики',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки',
    degree: 'bachelor',
    course: 1,
    group: 'КС-12',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 82.0,
    totalCreditsEarned: 30,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-106',
    moodleId: 106,
    fullName: 'Петренко Марія Володимирівна',
    email: 'petrenko.m@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/106/f1.jpg',
    studentCardNumber: 'KB-10293849',
    recordBookNumber: 'ЗК-2024-106',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра математичного моделювання та аналізу даних',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: 3,
    group: 'КС-31',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 95.2,
    totalCreditsEarned: 120,
    academicStanding: 'honors',
  },
  {
    id: 'karazin-student-108',
    moodleId: 108,
    fullName: 'Ткаченко Софія Михайлівна',
    email: 'tkachenko.s@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/108/f1.jpg',
    studentCardNumber: 'KB-22019485',
    recordBookNumber: 'ЗК-2025-108',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра штучного інтелекту та програмних систем',
    specialty: '121 Інженерія програмного забезпечення',
    educationalProgram: 'Програмна інженерія',
    degree: 'bachelor',
    course: 2,
    group: 'ПІ-21',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 91.0,
    totalCreditsEarned: 60,
    academicStanding: 'honors',
  },
  {
    id: 'karazin-student-112',
    moodleId: 112,
    fullName: 'Костенко Дарʼя Олександрівна',
    email: 'kostenko.d@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/112/f1.jpg',
    studentCardNumber: 'KB-22019486',
    recordBookNumber: 'ЗК-2025-112',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра безпеки інформаційних систем і технологій',
    specialty: '125 Кібербезпека та захист інформації',
    educationalProgram: 'Безпека інформаційних і комунікаційних систем',
    degree: 'bachelor',
    course: 2,
    group: 'КБ-21',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 87.5,
    totalCreditsEarned: 60,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-105',
    moodleId: 105,
    fullName: 'Іванов Олександр Дмитрович',
    email: 'ivanov.o@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/105/f1.jpg',
    studentCardNumber: 'KB-23018278',
    recordBookNumber: 'ЗК-2026-105',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра теоретичної та прикладної інформатики',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки',
    degree: 'bachelor',
    course: 1,
    group: 'КС-11',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 79.8,
    totalCreditsEarned: 30,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-107',
    moodleId: 107,
    fullName: 'Шевченко Данило Сергійович',
    email: 'shevchenko.d@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/107/f1.jpg',
    studentCardNumber: 'KB-23018279',
    recordBookNumber: 'ЗК-2026-107',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра теоретичної та прикладної інформатики',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки',
    degree: 'bachelor',
    course: 1,
    group: 'КС-12',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 83.1,
    totalCreditsEarned: 30,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-111',
    moodleId: 111,
    fullName: 'Савченко Богдан Павлович',
    email: 'savchenko.b@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/111/f1.jpg',
    studentCardNumber: 'KB-22019488',
    recordBookNumber: 'ЗК-2025-111',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра компʼютерних систем та мереж',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: 2,
    group: 'КС-22',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 85.3,
    totalCreditsEarned: 60,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-109',
    moodleId: 109,
    fullName: 'Бондаренко Максим Ігорович',
    email: 'bondarenko.m@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/109/f1.jpg',
    studentCardNumber: 'KB-22019489',
    recordBookNumber: 'ЗК-2025-109',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра штучного інтелекту та програмних систем',
    specialty: '121 Інженерія програмного забезпечення',
    educationalProgram: 'Програмна інженерія',
    degree: 'bachelor',
    course: 2,
    group: 'ПІ-21',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 88.0,
    totalCreditsEarned: 60,
    academicStanding: 'good',
  },
  {
    id: 'karazin-student-110',
    moodleId: 110,
    fullName: 'Мороз Анастасія Євгенівна',
    email: 'moroz.a@student.karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/110/f1.jpg',
    studentCardNumber: 'KB-10293851',
    recordBookNumber: 'ЗК-2024-110',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра математичного моделювання та аналізу даних',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: 3,
    group: 'КС-32',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 93.0,
    totalCreditsEarned: 120,
    academicStanding: 'honors',
  },
];

export interface StudentIdentifier {
  email?: string | null;
  username?: string | null;
  moodleId?: string | number | null;
  fullName?: string | null;
}

/**
 * Resolves a complete, authentic StudentProfile for any Moodle user.
 */
export function resolveStudentProfile(identifier?: StudentIdentifier | null): StudentProfile {
  if (!identifier) {
    return DEFAULT_STUDENT_PROFILE;
  }

  const rawEmail = (identifier.email || '').toLowerCase().trim();
  const rawUsername = (identifier.username || '').toLowerCase().trim();
  const rawMoodleId = identifier.moodleId ? String(identifier.moodleId) : '';
  const rawFullName = (identifier.fullName || '').toLowerCase().trim();

  for (const profile of KNOWN_STUDENT_PROFILES) {
    const profEmail = profile.email.toLowerCase();
    const profUsername = profEmail.split('@')[0];
    const profMoodleId = String(profile.moodleId);
    const profFullName = profile.fullName.toLowerCase();

    if (rawEmail && profEmail === rawEmail) {
      return profile;
    }

    if (rawUsername && (profUsername === rawUsername || rawUsername.includes(profUsername))) {
      return profile;
    }

    if (rawMoodleId && profMoodleId === rawMoodleId) {
      return profile;
    }

    const matchesFullName = Boolean(
      rawFullName &&
      (profFullName === rawFullName ||
        profFullName.includes(rawFullName) ||
        rawFullName.includes(profFullName)),
    );

    if (matchesFullName) {
      return profile;
    }
  }

  // Fallback generation for non-registered user
  const effectiveEmail =
    rawEmail || (rawUsername ? `${rawUsername}@student.karazin.ua` : DEFAULT_STUDENT_PROFILE.email);
  const cleanUsername = rawUsername.replace(/[@.]student\.karazin\.ua/g, '');
  const nameParts = (rawFullName || cleanUsername).split(/[._\s-]+/).filter(Boolean);
  const derivedFullName =
    nameParts.length >= 2
      ? nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      : identifier.fullName || 'Студент Каразінського Університету';

  const hash = Math.abs(
    (effectiveEmail + rawMoodleId)
      .split('')
      .reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0),
  );
  const courseYear = 2;

  return {
    id: `karazin-student-${rawMoodleId || hash % 1000}`,
    moodleId: rawMoodleId || (hash % 1000) + 100,
    fullName: derivedFullName,
    email: effectiveEmail,
    avatarUrl: rawMoodleId
      ? `https://moodle.universemvp.tech/user/pix.php/${rawMoodleId}/f1.jpg`
      : undefined,
    studentCardNumber: `KB-${20000000 + (hash % 9000000)}`,
    recordBookNumber: `ЗК-2025-${hash % 900}`,
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра компʼютерних систем та мереж',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: courseYear,
    group: `КС-${courseYear}1`,
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 87.5,
    totalCreditsEarned: courseYear * 30,
    academicStanding: 'good',
  };
}

/**
 * Academic registry of course metadata (credits, controlType, teachers)
 */
export interface CourseDeanMetadata {
  credits: number;
  controlType: ControlType;
  instructors: Array<{ name: string; email?: string; role?: string }>;
  cycle: 'general' | 'professional' | 'elective';
  hours?: { total: number; lectures: number; practicals: number; labs: number; selfStudy: number };
}

export const COURSE_DEAN_METADATA: Record<string, CourseDeanMetadata> = {
  'f3-net': {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Доц. Ткачов В. М.', email: 'tkachov.vitaliy@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 150, lectures: 32, practicals: 0, labs: 32, selfStudy: 86 },
  },
  'f3-prob-stat': {
    credits: 4,
    controlType: 'exam',
    cycle: 'general',
    instructors: [{ name: 'Доц. Шматко О. В.', email: 'shmatko.olena@karazin.ua', role: 'Лектор' }],
    hours: { total: 120, lectures: 32, practicals: 32, labs: 0, selfStudy: 56 },
  },
  'f3-os': {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Доц. Ляхов О. Л.', email: 'liakhov.oleksiy@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 150, lectures: 32, practicals: 0, labs: 32, selfStudy: 86 },
  },
  'f3-db': {
    credits: 4,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Проф. Куценко О. В.', email: 'kutsenko.oleksandr@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 120, lectures: 32, practicals: 0, labs: 32, selfStudy: 56 },
  },
  'f3-oop': {
    credits: 5,
    controlType: 'differentiated_credit',
    cycle: 'professional',
    instructors: [
      { name: 'Старш. викл. Бєлозьоров І. В.', email: 'belozorov.igor@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 150, lectures: 32, practicals: 0, labs: 32, selfStudy: 86 },
  },
  'f3-web': {
    credits: 4,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Проф. Куценко О. В.', email: 'kutsenko.oleksandr@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 120, lectures: 32, practicals: 0, labs: 32, selfStudy: 56 },
  },
  'f3-ai': {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [{ name: 'Доц. Барсуков С. М.', email: 'barsukov.sm@karazin.ua', role: 'Лектор' }],
    hours: { total: 150, lectures: 32, practicals: 0, labs: 32, selfStudy: 86 },
  },
  'f3-comp-arch': {
    credits: 4,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Доц. Ткачов В. М.', email: 'tkachov.vitaliy@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 120, lectures: 32, practicals: 0, labs: 32, selfStudy: 56 },
  },
  'f3-algo': {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [
      { name: 'Доц. Ляхов О. Л.', email: 'liakhov.oleksiy@karazin.ua', role: 'Лектор' },
    ],
    hours: { total: 150, lectures: 32, practicals: 0, labs: 32, selfStudy: 86 },
  },
  'f3-math-disc': {
    credits: 4,
    controlType: 'exam',
    cycle: 'general',
    instructors: [{ name: 'Доц. Шматко О. В.', email: 'shmatko.olena@karazin.ua', role: 'Лектор' }],
    hours: { total: 120, lectures: 32, practicals: 32, labs: 0, selfStudy: 56 },
  },
  'f3-lin-alg': {
    credits: 4,
    controlType: 'exam',
    cycle: 'general',
    instructors: [{ name: 'Проф. Сидоренко А. П.', email: 'sydorenko@karazin.ua', role: 'Лектор' }],
    hours: { total: 120, lectures: 32, practicals: 32, labs: 0, selfStudy: 56 },
  },
  'f3-math-1': {
    credits: 5,
    controlType: 'exam',
    cycle: 'general',
    instructors: [{ name: 'Проф. Сидоренко А. П.', email: 'sydorenko@karazin.ua', role: 'Лектор' }],
    hours: { total: 150, lectures: 32, practicals: 32, labs: 0, selfStudy: 86 },
  },
  cs301: {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [{ name: 'Проф. Коваленко О. І.', email: 'kovalenko@karazin.ua', role: 'Лектор' }],
  },
  cs302: {
    credits: 5,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [{ name: 'Доц. Барсуков С. М.', email: 'barsukov.sm@karazin.ua', role: 'Лектор' }],
  },
  cs303: {
    credits: 4,
    controlType: 'exam',
    cycle: 'professional',
    instructors: [{ name: 'Доц. Петренко В. О.', email: 'petrenko@karazin.ua', role: 'Лектор' }],
  },
};

/**
 * Enriches a raw Moodle course with academic curriculum dean data.
 */
export function enrichMoodleCourse(
  course: {
    id: number;
    fullname?: string;
    shortname?: string;
    name?: string;
    code?: string;
    summary?: string;
    credits?: number;
    controlType?: ControlType;
    instructors?: Array<{ name: string; email?: string; role?: string }>;
    progress?: number;
    status?: 'not_started' | 'in_progress' | 'completed';
  },
  studentCourseYear = 2,
): CurriculumItem {
  const shortname = (course.shortname || course.code || '').toLowerCase().trim();
  const fullname = course.fullname || course.name || shortname;

  let meta: CourseDeanMetadata | undefined;

  for (const [key, value] of Object.entries(COURSE_DEAN_METADATA)) {
    if (shortname === key || shortname.includes(key) || fullname.toLowerCase().includes(key)) {
      meta = value;
      break;
    }
  }

  // Fallback based on course keywords
  if (!meta) {
    const lowerName = fullname.toLowerCase();

    if (lowerName.includes('баз') || lowerName.includes('data')) {
      meta = COURSE_DEAN_METADATA['f3-db'];
    } else if (lowerName.includes('мереж') || lowerName.includes('net')) {
      meta = COURSE_DEAN_METADATA['f3-net'];
    } else if (lowerName.includes('систем') || lowerName.includes('os')) {
      meta = COURSE_DEAN_METADATA['f3-os'];
    } else if (lowerName.includes('алгоритм')) {
      meta = COURSE_DEAN_METADATA['f3-algo'];
    } else if (lowerName.includes('програм')) {
      meta = COURSE_DEAN_METADATA['f3-oop'];
    } else if (lowerName.includes('матем') || lowerName.includes('алгебр')) {
      meta = COURSE_DEAN_METADATA['f3-lin-alg'];
    } else {
      meta = {
        credits: 4,
        controlType: 'exam',
        cycle: 'professional',
        instructors: [{ name: 'Викладач кафедри', role: 'Лектор' }],
      };
    }
  }

  const semester = studentCourseYear * 2;
  const hash = Math.abs(
    (fullname + course.id).split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0),
  );
  const progress = course.progress !== undefined ? course.progress : 65 + (hash % 30);

  return {
    id: course.id,
    code: course.shortname || course.code || `CS${course.id}`,
    name: fullname,
    shortName: course.shortname || course.code || `CS${course.id}`,
    fullname,
    shortname: course.shortname || course.code || `CS${course.id}`,
    description:
      course.summary || 'Навчальна дисципліна індивідуального навчального плану студента.',
    credits: course.credits || meta.credits,
    semester,
    academicYear: '2026/2027',
    cycle: meta.cycle,
    controlType: course.controlType || meta.controlType,
    instructors:
      course.instructors && course.instructors.length > 0 ? course.instructors : meta.instructors,
    status: course.status || 'in_progress',
    progress,
    hours: meta.hours,
  };
}

/**
 * Generates realistic grade records for a student's enrolled courses based on their academic profile.
 */
export function generateStudentGradeRecords(
  courses: Array<{ id: number; fullname?: string; shortname?: string; name?: string }>,
  profile: StudentProfile,
): StudentRecordBookItem[] {
  if (!courses || courses.length === 0) {
    return [];
  }

  const targetGpa = profile.gpa || 88.0;

  return courses.map((c, index) => {
    const enriched = enrichMoodleCourse(c, profile.course);
    // Slight variance around target GPA (-4 to +4), deterministic per course id
    const variance = ((c.id * 7 + index * 11) % 9) - 4;
    const totalScore = Math.max(60, Math.min(100, Math.round(targetGpa + variance)));

    // Continuous score (0-60): ~60% of total
    const currentScore = Math.round((totalScore / 100) * 60);
    // Exam score (0-40): remainder
    const examScore = totalScore - currentScore;

    const ectsGrade = calculateEctsGrade(totalScore);
    const traditionalGrade = calculateTraditionalGrade(totalScore, enriched.controlType);

    return {
      id: `grade-${c.id}-${profile.moodleId}`,
      courseId: c.id,
      courseName: enriched.fullname || enriched.name,
      courseCode: enriched.code,
      credits: enriched.credits,
      semester: enriched.semester,
      academicYear: enriched.academicYear,
      controlType: enriched.controlType,
      currentScore,
      examScore: enriched.controlType === 'credit' ? null : examScore,
      totalScore,
      ectsGrade,
      traditionalGrade,
      instructorName: enriched.instructors[0]?.name,
      isPassed: totalScore >= 60,
      grade: String(totalScore),
    };
  });
}

/**
 * Generates a realistic weekly timetable for the student's enrolled courses.
 */
export function generateStudentSchedule(
  courses: Array<{ id: number; fullname?: string; shortname?: string; name?: string }>,
  profile: StudentProfile,
): ScheduleItem[] {
  if (!courses || courses.length === 0) {
    return [];
  }

  const PAIR_TIMES = [
    { start: '08:30', end: '10:05' },
    { start: '10:20', end: '11:55' },
    { start: '12:10', end: '13:45' },
    { start: '14:00', end: '15:35' },
  ];

  const LOCATIONS = [
    'Ауд. 6-45 (Головний корпус)',
    'Ауд. 2-14 (Північний корпус)',
    'Ауд. 3-08 (Лабораторний корпус)',
    'Online (Google Meet)',
    'Ауд. 5-22 (Обчислювальний центр)',
  ];

  const schedule: ScheduleItem[] = [];
  const days: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

  courses.forEach((c, idx) => {
    const enriched = enrichMoodleCourse(c, profile.course);
    const day = days[idx % days.length];
    const pair = PAIR_TIMES[idx % PAIR_TIMES.length];
    const loc = LOCATIONS[idx % LOCATIONS.length];

    schedule.push({
      id: `sch-lec-${c.id}`,
      courseId: c.id,
      title: `${enriched.name} (Лекція)`,
      type: 'lecture',
      instructor: enriched.instructors[0]?.name || 'Викладач кафедри',
      location: loc,
      startTime: pair.start,
      endTime: pair.end,
      dayOfWeek: day,
      weekType: 'all',
    });

    // Add lab/practice every second course
    if (idx % 2 === 0) {
      const nextPair = PAIR_TIMES[(idx + 1) % PAIR_TIMES.length];

      schedule.push({
        id: `sch-lab-${c.id}`,
        courseId: c.id,
        title: `${enriched.name} (Лабораторна робота)`,
        type: 'lab',
        instructor: enriched.instructors[0]?.name || 'Викладач кафедри',
        location: LOCATIONS[(idx + 2) % LOCATIONS.length],
        startTime: nextPair.start,
        endTime: nextPair.end,
        dayOfWeek: day,
        weekType: 'numerator',
      });
    }
  });

  return schedule;
}
