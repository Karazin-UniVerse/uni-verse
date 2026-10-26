import type { TranslationKey } from '@uni-hub/i18n/locales/uk';

export type BadgeId = 'DEADLINE_SNIPER' | 'NIGHT_OWL' | 'SEMESTER_MASTER';

export type BadgeDefinition = {
  descriptionKey: TranslationKey;
  id: BadgeId;
  titleKey: TranslationKey;
};

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export const BADGES: Record<BadgeId, BadgeDefinition> = {
  DEADLINE_SNIPER: {
    id: 'DEADLINE_SNIPER',
    titleKey: 'gamification.badges.deadlineSniper.title',
    descriptionKey: 'gamification.badges.deadlineSniper.description',
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    titleKey: 'gamification.badges.nightOwl.title',
    descriptionKey: 'gamification.badges.nightOwl.description',
  },
  SEMESTER_MASTER: {
    id: 'SEMESTER_MASTER',
    titleKey: 'gamification.badges.semesterMaster.title',
    descriptionKey: 'gamification.badges.semesterMaster.description',
  },
};

export const SEMESTER_MASTER_THRESHOLD = 80;
