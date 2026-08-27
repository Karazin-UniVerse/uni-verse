export type BadgeId = 'DEADLINE_SNIPER' | 'NIGHT_OWL' | 'SEMESTER_MASTER';

export type BadgeDefinition = {
  id: BadgeId;
  title: string;
  description: string;
};

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
