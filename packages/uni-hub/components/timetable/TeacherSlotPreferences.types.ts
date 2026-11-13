import type { SlotPreference } from '@core/constants/timetable';
import type { SlotPreferenceItem } from '@core/types/timetable';

export type SlotPreferenceUpdate = {
  slots: SlotPreferenceItem[];
  weekday: number;
  pair: number;
  preference?: SlotPreference;
};

export type SlotPreferenceViewProps = {
  slots: SlotPreferenceItem[];
  weekdays: string[];
  disabled: boolean;
  onChange: (weekday: number, pair: number, preference?: SlotPreference) => void;
};
