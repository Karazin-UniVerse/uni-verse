export type BadgeId = 'DEADLINE_SNIPER' | 'NIGHT_OWL' | 'SEMESTER_MASTER';

export type BadgeDefinition = {
  description: string;
  id: BadgeId;
  title: string;
};

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export const BADGES: Record<BadgeId, BadgeDefinition> = {
  DEADLINE_SNIPER: {
    id: 'DEADLINE_SNIPER',
    title: 'Deadline Sniper',
    description: 'Сдали задание до дедлайна',
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Зашли в дашборд между 22:00 и 05:00',
  },
  SEMESTER_MASTER: {
    id: 'SEMESTER_MASTER',
    title: 'Semester Master',
    description: 'Все курсы с оценкой ≥ 80',
  },
};

export const SEMESTER_MASTER_THRESHOLD = 80;
