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
} as const satisfies Record<TranslationKey, string>;
