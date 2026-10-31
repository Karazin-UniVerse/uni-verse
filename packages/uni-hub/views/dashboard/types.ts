import type { ReactNode } from 'react';
import type { StudentProfile } from '@core/types/student';
import type { LinkMoodleMode } from '@uni-hub/components/auth';
import type {
  MoodleCourse,
  Grade,
  Assignment,
  MoodleEvent,
  Notification,
  CourseStatistics,
} from '@core/types/moodle';
import type { NavKey, StudyView } from './constants';

export interface DashboardData {
  courses: MoodleCourse[];
  grades: Grade[];
  assignments: Assignment[];
  events: MoodleEvent[];
  notifications: Notification[];
  unreadCount: number;
  statistics: CourseStatistics | null;
}

export type NavigateHandler = (key: NavKey, studyView?: StudyView) => void;

export interface OverviewTabProps {
  courses: MoodleCourse[];
  events: MoodleEvent[];
  assignments: Assignment[];
  grades: Grade[];
  statistics: CourseStatistics | null;
  activeStudentProfile: StudentProfile | null;
  loading: boolean;
  onNavigate: NavigateHandler;
  isMoodleLinked?: boolean;
}

export interface StudyTabProps {
  view: StudyView;
  onViewChange: (view: StudyView) => void;
  children: ReactNode;
}

export interface CourseContentsProps {
  courseId: number;
}

export interface CoursesTabProps {
  courses: MoodleCourse[];
  soundEnabled: boolean;
}

export interface GradesTabProps {
  grades: Grade[];
  onOpenSimulator: () => void;
}

export interface AssignmentsTabProps {
  assignments: Assignment[];
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (val: 'asc' | 'desc') => void;
  hideCompleted: boolean;
  onHideCompletedChange: (val: boolean) => void;
  soundEnabled: boolean;
  onOpenAssignment: (item: Assignment) => void;
}

export interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  activeKey: NavKey;
  onSelectKey: (key: NavKey) => void;
  soundEnabled: boolean;
  onLogout: () => void;
  isMoodleLinked?: boolean;
}

export interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  mobileMenuOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notifications: Notification[];
  unreadCount: number;
  activeStudentProfile: StudentProfile | null;
  onOpenLinkMoodle?: (mode?: LinkMoodleMode) => void;
  onOpenUnlinkMoodle?: () => void;
  isMoodleLinked?: boolean;
}
