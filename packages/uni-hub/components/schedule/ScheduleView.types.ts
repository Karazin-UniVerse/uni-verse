import type { RescheduleScope } from '@core/constants/timetable';

export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'lab' | 'practice' | 'seminar' | 'exam' | 'other';
  location: string;
  meetingUrl?: string;
  teachingAssignmentId?: string;
  teacherName?: string;
  groupCodes?: string[];
}

export type ScheduleViewMode = 'day' | 'week' | 'month';

export interface ScheduleToolbarProps {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  onExportICS: () => void;
  onSubscribeCalendar?: () => void;
}

export interface ScheduleEventActions {
  getTypeName: (type: string) => string;
  isTeacher?: boolean;
  onEditMeetingUrl?: (event: ScheduleEvent) => void;
}

export interface ScheduleDayViewProps extends ScheduleEventActions {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  weekdays: string[];
  isCompact?: boolean;
}

export interface ScheduleWeekViewProps extends ScheduleEventActions {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  isCompact?: boolean;
}

export interface ScheduleWeekDayCardProps extends ScheduleEventActions {
  day: Date;
  events: ScheduleEvent[];
  isToday: boolean;
  locale: string;
}

export interface ScheduleWeekGridProps extends ScheduleEventActions {
  days: Date[];
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
}

export interface ScheduleEventCardProps extends ScheduleEventActions {
  event: ScheduleEvent;
  isDense?: boolean;
}

export interface ScheduleNavProps {
  title: string;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export interface ScheduleDotCalendarProps {
  monthDate: Date;
  selectedDate: Date;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  onSelectDate: (date: Date) => void;
  locale: string;
  weekdays: string[];
}

export interface ScheduleWeekStripProps {
  selectedDate: Date;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  onSelectDate: (date: Date) => void;
  locale: string;
}

export interface ScheduleEventGroup {
  key: string;
  title: string;
  start: Date;
  types: ScheduleEvent['type'][];
}

export interface ScheduleViewProps {
  events?: ScheduleEvent[];
  isTeacher?: boolean;
}

export interface ScheduleMonthViewProps extends ScheduleEventActions {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectDayMode: () => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  weekdays: string[];
  monthDays: Date[];
  isCompact?: boolean;
}

export interface ScheduleMonthDayCellProps {
  day: Date;
  events: ScheduleEvent[];
  inMonth: boolean;
  isToday: boolean;
  locale: string;
  getTypeName: (type: string) => string;
  onSelect: () => void;
}

export interface RescheduleFormValues {
  newDate: string;
  newPair: string;
  reason: string;
  scope: RescheduleScope;
}
