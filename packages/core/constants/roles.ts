export const Role = {
  USER: 'USER',
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
  OPPORTUNITIES_MODERATOR: 'OPPORTUNITIES_MODERATOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
