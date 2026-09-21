import type { TranslationKey } from './uk';

export const en = {
  'lang.uk': 'Ukrainian',
  'lang.en': 'English',
  'lang.select': 'Interface Language',
  'login.title': 'UNiHub',
  'login.subtitle': 'Sign in to your Moodle account',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign In',
  'login.loading': 'Signing in...',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.cyberpunk': 'Cyberpunk',
  'nav.overview': 'Overview',
  'nav.courses': 'Courses',
  'nav.assignments': 'Assignments',
  'nav.schedule': 'Schedule',
  'nav.grades': 'Grades',
  'sidebar.logout': 'Log out',
  'sidebar.moodleConnected': 'Moodle LMS (connected)',
} as const satisfies Record<TranslationKey, string>;
