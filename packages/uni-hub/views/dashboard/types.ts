import type { StudentProfile } from '@core/types';
import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  Notification,
  CourseStatistics,
} from '@uni-hub/types';

export const NAV_KEYS = ['overview', 'courses', 'grades', 'schedule', 'assignments'] as const;

export type NavKey = (typeof NAV_KEYS)[number];

const NAV_KEYS_SET: ReadonlySet<string> = new Set(NAV_KEYS);

export const isNavKey = (value: string): value is NavKey => NAV_KEYS_SET.has(value);

export interface DashboardData {
  courses: Course[];
  grades: Grade[];
  assignments: Assignment[];
  events: MoodleEvent[];
  notifications: Notification[];
  unreadCount: number;
  statistics: CourseStatistics | null;
}

export interface OverviewTabProps {
  courses: Course[];
  events: MoodleEvent[];
  assignments: Assignment[];
  grades: Grade[];
  statistics: CourseStatistics | null;
  activeStudentProfile: StudentProfile;
  loading: boolean;
  onNavigate: (key: NavKey) => void;
}

export interface CoursesTabProps {
  courses: Course[];
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
}

export interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  mobileMenuOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notifications: Notification[];
  unreadCount: number;
  activeStudentProfile: StudentProfile;
}
