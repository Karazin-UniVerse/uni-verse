import type { StudentProfile } from '@core/types';
import type { LinkMoodleMode } from '@uni-hub/components/auth';
import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  Notification,
  CourseStatistics,
} from '@uni-hub/types';
import type { NavKey } from './constants';

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
  isMoodleLinked?: boolean;
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
  isMoodleLinked?: boolean;
}

export interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
  mobileMenuOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notifications: Notification[];
  unreadCount: number;
  activeStudentProfile: StudentProfile;
  onOpenLinkMoodle?: (mode?: LinkMoodleMode) => void;
  onOpenUnlinkMoodle?: () => void;
  isMoodleLinked?: boolean;
}
