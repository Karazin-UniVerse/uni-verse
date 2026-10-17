export const moodleKeys = {
  all: ['moodle'] as const,
  courseContents: (courseId: number) => [...moodleKeys.all, 'course-contents', courseId] as const,
  assignmentStatus: (assignmentId: number) =>
    [...moodleKeys.all, 'assignment-status', assignmentId] as const,
};
