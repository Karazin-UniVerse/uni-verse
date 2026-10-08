export const Role = {
  STUDENT: 'student',
  ADMIN: 'admin',
  STAFF: 'staff',
  LECTURER: 'lecturer',
  OPPORTUNITIES_MODERATOR: 'opportunitiesModerator',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
