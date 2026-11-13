import type { SlotPreference } from '@core/constants/timetable';
import type {
  AcademicGroupResponse,
  SafeTeacherResponse,
  ScheduledEvent,
  TeacherSlotPreference,
} from '@core/types/timetable';

export type PreviewEvent = ScheduledEvent & {
  weekday?: number;
  dayOfWeek?: number;
  teacherName?: string;
  groupCode?: string;
  groupCodes?: string[];
  subgroupName?: string;
  streamName?: string;
  meetingUrl?: string | null;
};

export type ScheduleViewMode = 'week' | 'day';

export type TeachingTypeKey = 'lecture' | 'practice' | 'lab' | 'seminar';

/** Slot preferences by teacher id, then by `${weekday}-${pair}`. */
export type PreferenceIndex = Map<string, Map<string, SlotPreference>>;

export type SchedulePreviewProps = {
  events: PreviewEvent[];
  academicGroups: AcademicGroupResponse[];
  onAdjust?: (event: PreviewEvent, weekday: number) => void;
  teachers?: SafeTeacherResponse[];
  slotPreferences?: TeacherSlotPreference[];
};

export type ScheduleViewProps = {
  slots: Map<string, PreviewEvent[]>;
  academicGroups: AcademicGroupResponse[];
  preferences: PreferenceIndex;
  onAdjust?: (event: PreviewEvent, weekday: number) => void;
  highlightTeacherId?: string;
};
