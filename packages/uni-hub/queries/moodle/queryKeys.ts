export const moodleKeys = {
  all: ['moodle'] as const,
  allCourseContents: () => [...moodleKeys.all, 'course-contents'] as const,
  courseContents: (courseId: number) => [...moodleKeys.allCourseContents(), courseId] as const,
  assignmentStatus: (assignmentId: number) =>
    [...moodleKeys.all, 'assignment-status', assignmentId] as const,
  dashboard: (filters: Readonly<Record<string, string | boolean>>) =>
    [...moodleKeys.all, 'dashboard', filters] as const,
  profile: () => [...moodleKeys.all, 'profile'] as const,
};
