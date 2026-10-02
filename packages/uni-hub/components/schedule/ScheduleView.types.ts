export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'lab' | 'practice' | 'exam' | 'other';
  location: string;
}

export type ScheduleViewMode = 'day' | 'week' | 'month';

export interface ScheduleToolbarProps {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  onExportICS: () => void;
}

export interface ScheduleDayViewProps {
  selectedDate: Date;
  events: ScheduleEvent[];
  locale: string;
  getTypeName: (type: string) => string;
}

export interface ScheduleWeekViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getEventsForDate: (date: Date) => ScheduleEvent[];
  locale: string;
  getTypeName: (type: string) => string;
}

export interface ScheduleWeekDayCardProps {
  day: Date;
  events: ScheduleEvent[];
  isToday: boolean;
  locale: string;
  getTypeName: (type: string) => string;
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
