export const ROLE = {
  USER: 'USER',
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
  OPPORTUNITIES_MODERATOR: 'OPPORTUNITIES_MODERATOR',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
