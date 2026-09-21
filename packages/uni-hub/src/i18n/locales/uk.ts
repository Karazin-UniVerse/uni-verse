export const uk = {
  // Common / Lang
  'lang.uk': 'Українська',
  'lang.en': 'English',
  'lang.select': 'Мова інтерфейсу',

  // Login
  'login.title': 'UNiHub',
  'login.subtitle': 'Увійдіть у свій акаунт Moodle',
  'login.username': "Ім'я користувача",
  'login.password': 'Пароль',
  'login.submit': 'Увійти',
  'login.loading': 'Вхід...',

  // Themes
  'theme.light': 'Світла',
  'theme.dark': 'Темна',
  'theme.cyberpunk': 'Cyberpunk',
  'theme.select': 'Вибір теми',

  // Navigation (short & full)
  'nav.overview': 'Огляд',
  'nav.overview.full': 'Картка студента / Огляд',
  'nav.courses': 'Курси',
  'nav.courses.full': 'Індивідуальний план',
  'nav.assignments': 'Завдання',
  'nav.assignments.full': 'Завдання',
  'nav.schedule': 'Розклад',
  'nav.schedule.full': 'Розклад занять',
  'nav.grades': 'Оцінки',
  'nav.grades.full': 'Заліковка та бали',

  // Sidebar & Header
  'sidebar.logout': 'Вийти',
  'sidebar.moodleConnected': 'Moodle LMS (підключено)',
  'header.notifications': 'Сповіщення',
  'header.notifications.empty': 'Немає сповіщень',

  // Greetings
  'greeting.morning': 'Доброго ранку',
  'greeting.day': 'Доброго дня',
  'greeting.evening': 'Доброго вечора',
  'greeting.night': 'Доброї ночі',
  'greeting.student': 'студент',
  'greeting.noDeadlines': 'Найближчих дедлайнів немає — можна перепочити або заглянути у курси.',
  'greeting.deadlinePrefix': 'До',
  'greeting.deadlineRemaining': 'залишилося',
  'greeting.hours': 'год.',
  'greeting.willMakeIt': 'Встигнемо?',

  // Student Profile Card
  'student.demo': 'Демо-дані',
  'student.fullTime': 'Денна форма',
  'student.budget': 'Бюджет',
  'student.scholarship': 'Відмінник (Академічна стипендія)',
  'student.faculty': 'Факультет / Інститут',
  'student.department': 'Кафедра',
  'student.courseAndGroup': 'Курс / Академічна група',
  'student.card': 'Студентський квиток',
  'student.recordBook': 'Залікова книжка',
  'student.credits': 'Здобуто кредитів ECTS',
  'student.gpa': 'Рейтинговий бал (GPA)',
  'student.status': 'Академічний статус',
  'student.statusActive': 'Навчається (активний)',

  // Stats & Overview
  'overview.totalCourses': 'Всього дисциплін',
  'overview.pendingAssignments': 'Завдань до виконання',
  'overview.gpa': 'Рейтинговий бал (GPA)',
  'overview.currentCourses': 'Поточні дисципліни',
  'overview.all': 'Всі',
  'overview.upcomingDeadlines': 'Найближчі події та дедлайни',
  'overview.noEvents': 'Подій та дедлайнів не знайдено',
  'overview.noCourses': 'Дисципліни не знайдено',

  // Assignments Donut
  'donut.title': 'Статус завдань',
  'donut.empty': 'Завдання не знайдені',
  'donut.completed': 'Виконано',
  'donut.overdue': 'Прострочено',
  'donut.inProgress': 'В процесі',
} as const;

export type TranslationKey = keyof typeof uk;
export type Translations = Record<TranslationKey, string>;
