export const Role = {
  student: 'student',
  admin: 'admin',
  staff: 'staff',
  lecturer: 'lecturer',
  opportunitiesUser: 'opportunitiesUser',
  opportunitiesModerator: 'opportunitiesModerator',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
