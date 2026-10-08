export const Role = {
  USER: 'USER',
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
