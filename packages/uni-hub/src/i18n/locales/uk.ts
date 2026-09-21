export const uk = {
  'lang.uk': 'Українська',
  'lang.en': 'English',
  'lang.select': 'Мова інтерфейсу',
  'login.title': 'UNiHub',
  'login.subtitle': 'Увійдіть у свій акаунт Moodle',
  'login.username': "Ім'я користувача",
  'login.password': 'Пароль',
  'login.submit': 'Увійти',
  'login.loading': 'Вхід...',
  'theme.light': 'Світла',
  'theme.dark': 'Темна',
  'theme.cyberpunk': 'Cyberpunk',
  'theme.select': 'Вибір теми',
  'nav.overview': 'Огляд',
  'nav.courses': 'Курси',
  'nav.assignments': 'Завдання',
  'nav.schedule': 'Розклад',
  'nav.grades': 'Оцінки',
  'sidebar.logout': 'Вийти',
  'sidebar.moodleConnected': 'Moodle LMS (підключено)',
} as const;

export type TranslationKey = keyof typeof uk;
export type Translations = Record<TranslationKey, string>;
