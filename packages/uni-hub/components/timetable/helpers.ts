import { SLOT_PREFERENCE, type PairNumber, type SlotPreference } from '@core/constants/timetable';
import type {
  AcademicGroupResponse,
  SlotPreferenceItem,
  TeacherSlotPreference,
} from '@core/types/timetable';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import type { PreferenceIndex, PreviewEvent, TeachingTypeKey } from './SchedulePreview.types';
import type { SlotPreferenceUpdate } from './TeacherSlotPreferences.types';

export const PREVIEW_DAYS = [1, 2, 3, 4, 5, 6] as const;
export const PREVIEW_PAIRS: PairNumber[] = [1, 2, 3, 4, 5, 6, 7];

export const DAY_LABEL_KEYS = [
  'timetable.dayMon',
  'timetable.dayTue',
  'timetable.dayWed',
  'timetable.dayThu',
  'timetable.dayFri',
  'timetable.daySat',
] as const;

export const getEventWeekday = (event: PreviewEvent): number | null => {
  if (typeof event.weekday === 'number' && event.weekday >= 1 && event.weekday <= 6) {
    return event.weekday;
  }

  if (typeof event.dayOfWeek === 'number' && event.dayOfWeek >= 1 && event.dayOfWeek <= 6) {
    return event.dayOfWeek;
  }

  if (event.date) {
    const normalized = event.date.includes('T') ? event.date : `${event.date}T00:00:00Z`;
    const day = new Date(normalized).getUTCDay();

    if (day >= 1 && day <= 6) {
      return day;
    }
  }

  return null;
};

export const buildPreviewSlots = (events: PreviewEvent[]): Map<string, PreviewEvent[]> => {
  const slots = new Map<string, PreviewEvent[]>();
  const seenPerSlot = new Map<string, Set<string>>();
  const hasRegularEvents = events.some((event) => !event.isMakeupSaturday);

  for (const event of events) {
    if (hasRegularEvents && event.isMakeupSaturday) {
      continue;
    }

    const weekday = getEventWeekday(event);

    if (!weekday) {
      continue;
    }

    const span = Math.max(1, event.pairSpan ?? 1);
    const dedupeKey =
      event.teachingAssignmentId ||
      `${event.disciplineTitle}|${event.teachingType}|${event.teacherId}|${(event.groupCodes ?? event.groupIds ?? []).join(',')}|${event.subgroupId ?? ''}|${event.streamId ?? ''}`;

    for (let offset = 0; offset < span; offset += 1) {
      const pair = event.pair + offset;

      if (pair < 1 || pair > 7) {
        continue;
      }

      const slotKey = `${weekday}-${pair}`;
      let seen = seenPerSlot.get(slotKey);

      if (!seen) {
        seen = new Set<string>();
        seenPerSlot.set(slotKey, seen);
      }

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);

      const list = slots.get(slotKey) ?? [];

      list.push(event);
      slots.set(slotKey, list);
    }
  }

  return slots;
};

export const countDayEvents = (slots: Map<string, PreviewEvent[]>, weekday: number): number =>
  PREVIEW_PAIRS.reduce((total, pair) => total + (slots.get(`${weekday}-${pair}`)?.length ?? 0), 0);

export const getTeachingTypeKey = (type: string): TeachingTypeKey => {
  switch (type) {
    case 'PRACTICAL':
    case 'PRACTICE':
      return 'practice';
    case 'LABORATORY':
    case 'LAB':
      return 'lab';
    case 'SEMINAR':
      return 'seminar';
    default:
      return 'lecture';
  }
};

export const getTeachingTypeLabel = (type: string, formatMessage: FormatMessage): string => {
  switch (getTeachingTypeKey(type)) {
    case 'practice':
      return formatMessage('timetable.typePracticalShort');
    case 'lab':
      return formatMessage('timetable.typeLaboratoryShort');
    case 'seminar':
      return formatMessage('timetable.typeSeminarShort');
    default:
      return formatMessage('timetable.typeLectureShort');
  }
};

export const getTargetBadges = (
  event: PreviewEvent,
  academicGroups: AcademicGroupResponse[],
  formatMessage: FormatMessage,
): string[] => {
  const badges: string[] = [];

  if (event.streamName || event.streamId) {
    badges.push(
      formatMessage('timetable.streamBadge', {
        stream: event.streamName || event.streamId || '',
      }),
    );
  }

  const rawGroups = event.groupCodes?.length
    ? event.groupCodes
    : event.groupCode
      ? [event.groupCode]
      : (event.groupIds ?? []);

  if (rawGroups.length > 0) {
    const resolvedGroups = rawGroups.map((groupId) => {
      const matched = academicGroups.find(
        (group) => group.id === groupId || group.code === groupId,
      );

      return matched?.code ?? groupId;
    });

    badges.push(resolvedGroups.join(', '));
  }

  if (event.subgroupName || event.subgroupId) {
    const rawSubgroup = event.subgroupName || event.subgroupId || '';
    let resolvedSubgroup = rawSubgroup;

    for (const group of academicGroups) {
      const matched = group.subgroups?.find(
        (sub) => sub.id === rawSubgroup || sub.name === rawSubgroup,
      );

      if (matched) {
        resolvedSubgroup = matched.name;
        break;
      }
    }

    badges.push(
      formatMessage('timetable.subgroupBadge', {
        subgroup: resolvedSubgroup,
      }),
    );
  }

  return badges;
};

export const buildPreferenceIndex = (preferences: TeacherSlotPreference[]): PreferenceIndex => {
  const index: PreferenceIndex = new Map();

  for (const { teacherId, weekday, pair, preference } of preferences) {
    const slots = index.get(teacherId) ?? new Map<string, SlotPreference>();

    slots.set(`${weekday}-${pair}`, preference);
    index.set(teacherId, slots);
  }

  return index;
};

export const getSlotPreference = (
  index: PreferenceIndex,
  teacherId: string | undefined,
  slotKey: string,
): SlotPreference | undefined => (teacherId ? index.get(teacherId)?.get(slotKey) : undefined);

/** Neutral, then preferred, then undesirable, then neutral again. */
export const getNextSlotPreference = (current?: SlotPreference): SlotPreference | undefined => {
  if (current === undefined) {
    return SLOT_PREFERENCE.PREFERRED;
  }

  return current === SLOT_PREFERENCE.PREFERRED ? SLOT_PREFERENCE.UNDESIRABLE : undefined;
};

/** Replaces one slot's preference; no preference means neutral and removes the slot. */
export const setSlotPreference = ({
  slots,
  weekday,
  pair,
  preference,
}: SlotPreferenceUpdate): SlotPreferenceItem[] => {
  const remaining = slots.filter((slot) => slot.weekday !== weekday || slot.pair !== pair);

  return preference ? [...remaining, { weekday, pair, preference }] : remaining;
};

export const findSlotPreference = (
  slots: SlotPreferenceItem[],
  weekday: number,
  pair: number,
): SlotPreference | undefined =>
  slots.find((slot) => slot.weekday === weekday && slot.pair === pair)?.preference;

export const getPreferenceStateKey = (
  preference?: SlotPreference,
): 'preferences.preferred' | 'preferences.undesirable' | 'preferences.neutral' => {
  if (preference === SLOT_PREFERENCE.PREFERRED) {
    return 'preferences.preferred';
  }

  return preference === SLOT_PREFERENCE.UNDESIRABLE
    ? 'preferences.undesirable'
    : 'preferences.neutral';
};
