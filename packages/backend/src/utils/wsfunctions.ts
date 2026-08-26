const wsfunctions: Record<string, string> = {
  getCourses: 'core_enrol_get_users_courses',
  getCourseContents: 'core_course_get_contents',
  getGrades: 'gradereport_overview_get_course_grades',
  getAssignments: 'mod_assign_get_assignments',
  getAssignmentSubmissionStatus: 'mod_assign_get_submission_status',
  saveAssignmentSubmission: 'mod_assign_save_submission',
  getUpcomingEvents: 'core_calendar_get_calendar_upcoming_view',
  getNotifications: 'message_popup_get_popup_notifications',
};

export function getWsFunctionName(wsfunction: string) {
  return wsfunctions[wsfunction];
}

//console.log(getWsFunctionName('getCourses'));
