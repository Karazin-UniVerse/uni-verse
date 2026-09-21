import type { TranslationKey } from './uk';

export const en = {
  // Common / Lang
  'lang.uk': 'Ukrainian',
  'lang.en': 'English',
  'lang.select': 'Interface Language',

  // Login
  'login.title': 'UNiHub',
  'login.subtitle': 'Sign in to your Moodle account',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign In',
  'login.loading': 'Signing in...',

  // Themes
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.cyberpunk': 'Cyberpunk',
  'theme.select': 'Theme selection',

  // Navigation (short & full)
  'nav.overview': 'Overview',
  'nav.overview.full': 'Student Card / Overview',
  'nav.courses': 'Courses',
  'nav.courses.full': 'Study Plan',
  'nav.assignments': 'Assignments',
  'nav.assignments.full': 'Assignments',
  'nav.schedule': 'Schedule',
  'nav.schedule.full': 'Class Schedule',
  'nav.grades': 'Grades',
  'nav.grades.full': 'Gradebook & Scores',

  // Sidebar & Header
  'sidebar.logout': 'Log out',
  'sidebar.moodleConnected': 'Moodle LMS (connected)',
  'header.notifications': 'Notifications',
  'header.notifications.empty': 'No notifications',

  // Greetings
  'greeting.morning': 'Good morning',
  'greeting.day': 'Good afternoon',
  'greeting.evening': 'Good evening',
  'greeting.night': 'Good night',
  'greeting.student': 'student',
  'greeting.noDeadlines': 'No upcoming deadlines — time to relax or review courses.',
  'greeting.deadlinePrefix': '',
  'greeting.deadlineRemaining': 'due in',
  'greeting.hours': 'hrs.',
  'greeting.willMakeIt': 'Ready?',

  // Student Profile Card
  'student.demo': 'Demo data',
  'student.fullTime': 'Full-time',
  'student.budget': 'State-funded',
  'student.scholarship': 'Honors (Academic scholarship)',
  'student.faculty': 'Faculty / Institute',
  'student.department': 'Department',
  'student.courseAndGroup': 'Year / Academic Group',
  'student.card': 'Student ID',
  'student.recordBook': 'Record Book',
  'student.credits': 'ECTS Credits Earned',
  'student.gpa': 'Grade Point Average (GPA)',
  'student.status': 'Academic Status',
  'student.statusActive': 'Enrolled (active)',

  // Stats & Overview
  'overview.totalCourses': 'Total Courses',
  'overview.pendingAssignments': 'Pending Assignments',
  'overview.gpa': 'Grade Point Average (GPA)',
  'overview.currentCourses': 'Current Courses',
  'overview.all': 'All',
  'overview.upcomingDeadlines': 'Upcoming Events & Deadlines',
  'overview.noEvents': 'No events or deadlines found',
  'overview.noCourses': 'No courses found',

  // Assignments Donut
  'donut.title': 'Assignment Status',
  'donut.empty': 'No assignments found',
  'donut.completed': 'Completed',
  'donut.overdue': 'Overdue',
  'donut.inProgress': 'In progress',

  // Streak
  'streak.title': 'Streak',
  'streak.day': 'day',
  'streak.daysFew': 'days',
  'streak.daysMany': 'days',

  // Courses
  'courses.instructor': 'Instructor',
  'courses.curriculumSubject': 'Individual study plan curriculum subject',
  'courses.progress': 'Completion progress',
  'courses.viewMaterials': 'View course materials',

  // Control forms
  'control.exam': 'Exam',
  'control.credit': 'Pass/Fail Credit',
  'control.diffCredit': 'Graded Credit',

  // Course Contents
  'courseContents.back': 'Back to courses',
  'courseContents.breadcrumbs': 'Courses',
  'courseContents.title': 'Course Contents',
  'courseContents.loading': 'Loading contents...',
  'courseContents.loadError': 'Failed to load course contents',
  'courseContents.empty': 'There are no materials available in this course yet.',
  'courseContents.moduleType': 'Type',

  // Grades Tab & Table
  'grades.subtitle': 'Electronic gradebook and grade simulator',
  'grades.simulatorBtn': 'Grade Simulator (What if?)',
  'grades.discipline': 'Discipline',
  'grades.colCourse': 'Discipline',
  'grades.colCredits': 'ECTS Credits',
  'grades.colControl': 'Control Form',
  'grades.colCurrent': 'Current Score (0–60)',
  'grades.colExam': 'Exam (0–40)',
  'grades.colFinal': 'Final 100-Point Grade',
  'grades.colEcts': 'ECTS Grade',
  'grades.colTraditional': 'National Grade',
  'grades.excellent': 'Excellent',
  'grades.good': 'Good',
  'grades.satisfactory': 'Satisfactory',
  'grades.unsatisfactory': 'Unsatisfactory',
  'grades.passed': 'Passed',
  'grades.failed': 'Failed',

  // Grade Simulator
  'simulator.modalTitle': 'Grade Simulator — "What if?"',
  'simulator.empty': 'No grades available for simulation',
  'simulator.hint':
    'Current discipline score makes up 70% of the final. Hypothetical works make up the remaining 30%.',
  'simulator.forecast': 'Final result forecast (100-point scale & ECTS)',
  'simulator.noAssignments': 'No assignments for this discipline — showing current score',

  // Assignments Tab
  'assignments.filters': 'Filters',
  'assignments.hideFilters': 'Hide filters',
  'assignments.dateFrom': 'Date from',
  'assignments.dateTo': 'Date to',
  'assignments.oldestFirst': 'Oldest first',
  'assignments.newestFirst': 'Newest first',
  'assignments.hideCompleted': 'Hide completed',
  'assignments.deadline': 'Deadline',
  'assignments.noDueDate': 'No due date',
  'assignments.emptyAllDone':
    'Hooray, all assignments completed! Time to relax or review lectures 🎉',

  // Schedule View
  'schedule.modeMonth': 'Month',
  'schedule.modeWeek': 'Week',
  'schedule.modeDay': 'Day',
  'schedule.viewModeAria': 'Schedule mode',
  'schedule.exportICal': 'Export to iCal',
  'schedule.prevWeek': 'Previous week',
  'schedule.nextWeek': 'Next week',
  'schedule.freeDay': 'Free day',
  'schedule.scheduleFor': 'Schedule for',
  'schedule.noClasses': 'No classes for this day',
  'schedule.typeLecture': 'Lecture',
  'schedule.typeLab': 'Laboratory',
  'schedule.typePractice': 'Practical class',
  'schedule.typeExam': 'Exam',
  'schedule.typeOther': 'Consultation',

  // Header & Audio
  'header.soundMute': 'Mute sound',
  'header.soundUnmute': 'Unmute sound',
  'header.openMenu': 'Open menu',
  'header.userMenu': 'User profile menu',
  'header.unreadCount': 'new',

  // Assignment Modal
  'assignmentModal.defaultTitle': 'Assignment',
  'assignmentModal.loadingStatus': 'Loading status...',
  'assignmentModal.loadStatusError': 'Failed to load assignment status',
  'assignmentModal.openMoodle': 'Open original assignment on Moodle',
  'assignmentModal.description': 'Description',
  'assignmentModal.attachedFiles': 'Attached files',
  'assignmentModal.download': 'Download',
  'assignmentModal.submissionStatus': 'Submission status',
  'assignmentModal.status': 'Status',
  'assignmentModal.grade': 'Grade',
  'assignmentModal.noStatusData': 'No status data available',
  'assignmentModal.submitTitle': 'Submit assignment',
  'assignmentModal.answerText': 'Answer text',
  'assignmentModal.placeholder': 'Enter your submission here...',
  'assignmentModal.attachFile': 'Attach file',
  'assignmentModal.dragDrop': 'Drag and drop a file here or',
  'assignmentModal.browse': 'browse',
  'assignmentModal.cancel': 'Cancel',
  'assignmentModal.submit': 'Submit',
  'assignmentModal.uploading': 'Uploading file...',
  'assignmentModal.submitSuccess': 'Submission sent successfully',
  'assignmentModal.submitError': 'Error submitting assignment',
  'assignmentModal.formRequired': 'Please enter text or attach a file',
  'assignmentModal.statusSubmitted': 'Submitted for grading',
  'assignmentModal.statusGraded': 'Graded',
  'assignmentModal.statusNew': 'No attempt',
  'assignmentModal.statusDraft': 'Draft',
} as const satisfies Record<TranslationKey, string>;
