export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'lab' | 'practice' | 'exam' | 'other';
  location: string;
}

export type ScheduleViewMode = 'day' | 'week' | 'month';
