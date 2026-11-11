export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'lab' | 'practice' | 'exam' | 'other';
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

export interface ScheduleDayViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: ScheduleEvent[];
  locale: string;
  getTypeName: (type: string) => string;
  isTeacher?: boolean;
  onEditMeetingUrl?: (event: ScheduleEvent) => void;
}

export interface ScheduleWeekViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  getTypeName: (type: string) => string;
  isTeacher?: boolean;
  onEditMeetingUrl?: (event: ScheduleEvent) => void;
}

export interface ScheduleWeekDayCardProps {
  day: Date;
  events: ScheduleEvent[];
  isToday: boolean;
  locale: string;
  getTypeName: (type: string) => string;
  isTeacher?: boolean;
  onEditMeetingUrl?: (event: ScheduleEvent) => void;
}

export interface ScheduleViewProps {
  events?: ScheduleEvent[];
  isTeacher?: boolean;
}

export interface ScheduleMonthViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectDayMode: () => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  weekdays: string[];
  monthDays: Date[];
}

export interface ScheduleMonthDayCellProps {
  day: Date;
  events: ScheduleEvent[];
  inMonth: boolean;
  isToday: boolean;
  onSelect: () => void;
}
