export const moodleKeys = {
  all: ['moodle'] as const,
  courseContents: (courseId: number) => [...moodleKeys.all, 'course-contents', courseId] as const,
  assignmentStatus: (assignmentId: number) =>
    [...moodleKeys.all, 'assignment-status', assignmentId] as const,
  dashboards: () => [...moodleKeys.all, 'dashboard'] as const,
  dashboard: (filters: Readonly<Record<string, string | boolean>>) =>
    [...moodleKeys.all, 'dashboard', filters] as const,
  profile: () => [...moodleKeys.all, 'profile'] as const,
};
