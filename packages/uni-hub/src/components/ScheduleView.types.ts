export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'practice' | 'exam' | 'other';
  location: string;
}

export type ScheduleViewMode = 'day' | 'week' | 'month';
