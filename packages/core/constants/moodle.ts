export const COURSE_MODULE_NAMES = {
  RESOURCE: 'resource',
  FOLDER: 'folder',
  ASSIGN: 'assign',
  QUIZ: 'quiz',
  FORUM: 'forum',
} as const;

export type CourseModuleName =
  (typeof COURSE_MODULE_NAMES)[keyof typeof COURSE_MODULE_NAMES] | (string & {});
