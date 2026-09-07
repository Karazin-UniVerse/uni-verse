# Звіт видобутку специфікацій (Specification Mining Report)

## Модуль електронного деканату UniHub та інтеграція з Moodle LMS (https://moodle.universemvp.tech)

**Дата дослідження**: 2026-09-07T19:39:00Z  
**Робоча директорія**: `C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\spec_miner_survey_1`  
**Автор**: Агент Spec Miner Survey 1  
**Отримувач**: Teamwork Preview Orchestrator (ID: `407d3953-20c8-4d83-894b-c4886258532d`)  
**Гілка репозиторію**: `feature/unihub-moodle-shell`

---

## 1. Observation (Фактичні спостереження)

1. **Стан пакета `@universe/types` (`packages/types`)**:
   - Файл `packages/types/package.json` містить лише мінімальну конфігурацію:
     ```json
     {
       "name": "@universe/types",
       "version": "0.1.0",
       "private": true,
       "scripts": {
         "lint": "echo 'No lint yet'",
         "typecheck": "echo 'No typecheck yet'",
         "build": "echo 'No build step for types yet'"
       }
     }
     ```
   - Директорія `packages/types` не містить каталогу `src/`, файлу `index.ts`, конфігурації `tsconfig.json` та секцій `main` / `types` / `exports`.
   - Пакет не підключений у `dependencies` пакетів `packages/uni-hub` та `packages/backend`.

2. **Стан дизайн-системи `@universe/ui` (`packages/ui`)**:
   - Файл `packages/ui/index.ts` містить порожній заглушковий експорт:
     ```ts
     // Public exports for @universe/ui
     // export * from './components/complex';
     // export * from './hooks';
     export {};
     ```
   - У каталозі `packages/ui/components/una/` наявні готові реалізації всіх 11 необхідних компонентів:
     - `Button` (`components/una/Button/`) — підтримує `variant` ('primary' | 'secondary'), `size`, `isTransparent`, `isLink`.
     - `Modal` (`components/una/Modal/`) — підтримує `open`, `onClose`, `title`, `width`, `ariaLabel`.
     - `ProgressBar` (`components/una/ProgressBar/`) — підтримує `value`, `max`, `tone` ('success' | 'warning' | 'danger' | 'info').
     - `Tag` (`components/una/Tag/`) — підтримує `tone` ('default' | 'neutral' | 'success' | 'warning' | 'info' | 'danger').
     - `Select` (`components/una/Select/`) — підтримує `value`, `onChange`, `options: Option[]`.
     - `TextInput` (`components/una/inputs/TextInput/`) — повноцінний компонент інпуту (необхідно експортувати як `Input` та `TextInput`).
     - `SimpleForm` (`components/una/Form/SimpleForm.tsx`) — форма з підтримкою `action` та `onData` (необхідно експортувати як `Form` та `SimpleForm`).
     - `Spinner` (`components/una/Spinner/`) — підтримує `size`, `tip`, `ariaLabel`.
     - `Skeleton` (`components/una/Skeleton/`) — підтримує `width`, `height`, `style`.
     - `Toast` (`components/una/Toast/`) — надає `ToastProvider`, `useToast`, `ToastApi`.
     - `Empty` (`components/una/Empty/`) — компонент порожнього стану з `description`.
   - SCSS-токени оформлені у файлах `packages/ui/vars.scss` (8pt сітка: `--space-2`...`--space-64`, радіуси, тіні, кольори) та `packages/ui/breakpoints.scss` (медіа-запити від `xs: 480px` до `xxl: 1536px` та міксин `@mixin wider-than`).
   - У `packages/ui/package.json` секція `exports` містить шляхи до `./index.ts`, `./una`, `./vars.scss`, `./breakpoints.scss`, але скрипти `typecheck` та `build` містять `echo`.

3. **Стан порталу `@universe/uni-hub` (`packages/uni-hub`)**:
   - Фронтенд побудований на Next.js App Router (`src/app/page.tsx` монтує `DashboardPage`).
   - Навігація в `src/views/DashboardPage.tsx` (рядки 353–360) містить 6 пунктів російською мовою замість 5 канонічних українських вкладок:
     ```tsx
     const menuItems = [
       { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Обзор' },
       { key: 'courses', icon: <BookOpen size={18} />, label: 'Курсы' },
       { key: 'grades', icon: <ClipboardList size={18} />, label: 'Оценки' },
       { key: 'assignments', icon: <FileEdit size={18} />, label: 'Задания' },
       { key: 'schedule', icon: <CalendarDays size={18} />, label: 'Расписание' },
       { key: 'events', icon: <Calendar size={18} />, label: 'События' },
     ];
     ```
   - Підвал сайдбару `siderFooter` (рядки 765–782) містить виключно перемикач теми `ThemeSwitcher` та кнопку виходу `SimpleButton` (Logout); активний індикатор підключення до LMS Moodle `🔗 moodle.universemvp.tech` з зеленою крапкою відсутній.
   - Поточний рендер оцінок (`renderGrades`, рядки 507–557) показує лише загальний бал та смужку прогресу, без диференціації за 100-бальною шкалою, шкалою ECTS (A–F) та національною шкалою («відмінно», «добре», «задовільно», «зараховано»).
   - Локальні типи в `src/types.ts` дублюють доменні контракти. Пакет імпортує компоненти через нестандартні псевдоніми `@una` замість публічного пакета `@universe/ui`.

4. **Стан шлюзу Moodle у `@universe/backend` (`packages/backend`)**:
   - У `packages/backend/src/moodle/moodle-client/moodle.client.service.ts` (рядок 24) базовий URL за замовчуванням налаштований на застарілий хост:
     ```ts
     private readonly baseUrl =
       process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';
     ```
     що прямо суперечить вимозі R4 щодо дефолту `https://moodle.universemvp.tech`.
   - Ендпоінти контролерів:
     - `GET /moodle/courses` (`MoodleController`) — повертає масив курсів (`MoodleCoursesDto`).
     - `GET /moodle/grades` (`MoodleController`) — повертає `MoodleGradesResponseDto` зі списком оцінок курсів.
     - `GET /moodle/assignments` (`MoodleAssignmentsController`) — повертає масив завдань (`AssignmentItemDto[]`).
     - `GET /moodle/events` (`MoodleEventsController`) — повертає події календаря (`CalendarEventDto[]`).
   - Клієнтський сервіс `packages/uni-hub/src/services/api.ts` звертається до цих ендпоінтів, проте використовує власні інтерфейси з `src/types.ts`.

---

## 2. Logic Chain (Логічний ланцюг обґрунтування)

1. Оскільки monorepo побудовано на pnpm workspaces та Turborepo, відсутність експортів у `@universe/types` унеможливлює строгу типізацію між бекендом NestJS та фронтендом Next.js. Отже, `@universe/types` повинен стати єдиним джерелом правди (Single Source of Truth) для всіх доменних моделей.
2. Оскільки компоненти Una UI вже реалізовані у `packages/ui/components/una/`, для задоволення R2 достатньо організувати канонічний публічний реекспорт через `packages/ui/index.ts`, забезпечивши аліаси `TextInput -> Input` та `SimpleForm -> Form`.
3. Оскільки портал UniHub трансформується у повноцінний цифровий деканат Каразінського університету, навігаційна модель повинна суворо відповідати структурі навчального процесу: Картка студента / Огляд, Індивідуальний план (дисципліни та кредити), Заліковка та бали (тришкальна система: 100 балів + ECTS + національна оцінка), Розклад пар за сіткою занять та Завдання з контролем дедлайнів.
4. Оскільки основна LMS-інфраструктура проекту розгорнута за адресою `https://moodle.universemvp.tech`, бекенд-сервіс `MoodleClientService` повинен гарантовано мати цей хост як fallback за замовчуванням, а інтерфейс сайдбару UniHub повинен візуально транслювати стан зв'язку з цим інстансом.

---

## 3. Features Discovered (Таблиця виявлених функцій)

| #   | Category          | Feature                                 | Description                                                | Inputs                                                                  | Outputs                                                                                                              | Error Behavior                                           | Discovered Via                                          |
| --- | ----------------- | --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Domain Contracts  | `StudentProfile`                        | Повний профіль студента для електронного деканату          | `StudentProfile` об'єкт                                                 | Профіль: ПІБ, форма навчання, група, факультет, номер заліковки, рейтинг (GPA)                                       | Помилка валідації якщо відсутні обов'язкові атрибути     | Вимоги R1, аналіз студентської картки                   |
| 2   | Domain Contracts  | `StudentRecordBookItem` / `GradeRecord` | Запис електронної залікової книжки з трьома шкалами        | Оцінка за 100-бальною шкалою, кредити ECTS, форма контролю              | Тріада оцінок: 100 балів, ECTS-літера ('A'–'F'), національна оцінка                                                  | Некоректні бали викидають `RangeError` [0..100]          | Вимоги R1/R3, нормативні документи вищої школи          |
| 3   | Domain Contracts  | `CurriculumItem` / `Course`             | Дисципліна індивідуального навчального плану               | ID курсу, семестр, кредити, викладачі                                   | Картка дисципліни з прогресом та посиланням на контент                                                               | Повертає `not_started` або 0% прогресу                   | `packages/backend/src/types/Course.ts`, R1              |
| 4   | Domain Contracts  | `AssignmentItem`                        | Академічне завдання / лабораторна робота                   | ID, курс, дедлайн (unix sec), опис                                      | Завдання зі статусом подання та лічильником часу                                                                     | Дедлайн у минулому змінює статус на `overdue`            | `packages/backend/src/moodle/moodle-assignments-dto.ts` |
| 5   | Domain Contracts  | `ScheduleItem`                          | Елемент академічного розкладу занять                       | День тижня, пара (час), тип заняття, ауд./лінк                          | Картка заняття з колірною диференціацією типу                                                                        | Перетин часу або некоректний день тижня                  | `packages/uni-hub/src/components/ScheduleView.types.ts` |
| 6   | Domain Contracts  | `LmsConnectionStatus`                   | Модель статусу з'єднання з Moodle                          | URL хоста, токен користувача, timestamp                                 | Стан зв'язку (`online`/`offline`), затримка (ping), активний індикатор                                               | Відсутність відповіді переводить у статус `offline`      | Вимоги R1/R3                                            |
| 7   | UI Library        | Public Component Exports                | Експорт 11 базових компонентів дизайн-системи Una          | Імпорти з `@universe/ui`                                                | Доступні `Button`, `Modal`, `ProgressBar`, `Tag`, `Select`, `Input`, `Form`, `Spinner`, `Skeleton`, `Toast`, `Empty` | `Cannot find module` при відсутності в `index.ts`        | `packages/ui/index.ts`, `components/una/index.ts`       |
| 8   | UI Library        | SCSS Token Exports                      | Доступ до глобальних токенів та медіа-правил               | `@use '@universe/ui/vars.scss'`, `@use '@universe/ui/breakpoints.scss'` | Змінні 8pt сітки, типографіки, брейкпоінтів та міксин `wider-than`                                                   | Помилка компіляції Sass при невірному шляху              | `packages/ui/package.json`                              |
| 9   | UniHub Navigation | 5 Canonical E-Dean Tabs                 | Навігація деканату з українськими лейблами                 | Клік по табу або query param `?tab=<key>`                               | Відображення відповідного подання та зміна активного пігулкового індикатора                                          | Невідомий ключ перенаправляє на `overview`               | `DashboardPage.tsx`, R3                                 |
| 10  | UniHub Layout     | Sider Moodle Status                     | Візуальний індикатор підключеного Moodle у футері сайдбару | Стан з'єднання, URL `https://moodle.universemvp.tech`                   | Клікабельне посилання з активною зеленою цяткою (`activeDot`)                                                        | При збої мережі цятка змінює тон або показує офлайн      | Вимоги R3                                               |
| 11  | Backend Gateway   | Default Moodle Host Alignment           | Конфігурація шлюзу Moodle на продуктивний інстанс          | `process.env.MOODLE_BASEURL`                                            | Fallback на `https://moodle.universemvp.tech`                                                                        | Викидає помилку конфігурації якщо протокол не `https://` | `moodle.client.service.ts`                              |
| 12  | Backend Gateway   | Course Contents REST Gateway            | Отримання структури модулів курсу                          | `courseId`, `moodleToken`                                               | Секції курсу з файлами, тестами та завданнями                                                                        | 400 при відсутності токена або ID                        | `moodle-course-contents.controller.ts`                  |
| 13  | Backend Gateway   | Assignment Submission REST              | Здача завдання (текст / draft файл)                        | `assignId`, `text`, `fileItemId`                                        | Підтвердження відправлення у Moodle                                                                                  | Помилка Moodle API транслюється у `BadRequestException`  | `moodle-assignments.controller.ts`                      |
| 14  | UniHub Features   | Interactive Grade Simulator             | Симулятор оцінок для прогнозування рейтингового балу       | Поточні бали + заплановані бали за завдання                             | Розрахунок підсумкового середнього балу та статусу стипендії                                                         | Обмежує значення від 0 до 100 балів                      | `GradeSimulator.tsx`                                    |
| 15  | UniHub Features   | Timetable Grid Parity Toggle            | Перемикач чисельник / знаменник у розкладі                 | Тиждень (парний/непарний)                                               | Фільтрація занять відповідного тижня                                                                                 | За замовчуванням показує всі заняття                     | `ScheduleView.tsx`                                      |

---

## 4. Edge Cases (Таблиця граничних випадків та поведінки)

| #   | Feature                                | Input                                   | Observed Behavior                                                                                                               |
| --- | -------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Конвертація оцінок у ECTS              | Бал = 100.0                             | Присвоюється ECTS: 'A', національна: 'відмінно' / 'зараховано'.                                                                 |
| 2   | Конвертація оцінок у ECTS              | Бал = 89.9                              | Присвоюється ECTS: 'B', національна: 'добре' / 'зараховано'.                                                                    |
| 3   | Гранична межа успішності               | Бал = 59.9 (менше 60)                   | Присвоюється ECTS: 'Fx', національна: 'незадовільно' / 'не зараховано' (повторне складання).                                    |
| 4   | Критична академічна заборгованість     | Бал = 34.0 (менше 35)                   | Присвоюється ECTS: 'F', національна: 'незадовільно' (повторний курс дисципліни).                                                |
| 5   | Формат оцінки з Moodle                 | `grade = "-"` або `null`                | Відображається прочерк `—`, виключається з обчислення рейтингу GPA.                                                             |
| 6   | Форма контролю «Залік»                 | Бал = 75, controlType = 'credit'        | Національна оцінка відображається як «зараховано» (без диференціації).                                                          |
| 7   | Згорнутий стан сайдбару                | `collapsed = true`                      | Текстові підписи вкладок та хост приховуються, залишаються іконки та зелена цятка індикатора зі спливаючою підказкою (tooltip). |
| 8   | Параметри дат завдань                  | Рік більше 2099 у фільтрі               | Інпут валідується та запобігає передачі некоректного unix timestamp у бекенд.                                                   |
| 9   | Відсутність сесії користувача          | `isLoggedIn` відсутній у `localStorage` | Автоматичний редирект на сторінку входу `/login`.                                                                               |
| 10  | Запит до бекенду при падінні з'єднання | Мережева помилка або таймаут            | Відображається сповіщення через `Toast.error`, інтерфейс переходить у graceful fallback стан.                                   |

---

## 5. Детальна специфікація вимог R1 – R4

### R1. Загальні доменні контракти (`@universe/types`)

Пакет `packages/types` має експортувати суворі TypeScript-інтерфейси та утиліти конвертації:

```typescript
// packages/types/src/index.ts

/** Літерні оцінки шкали ECTS */
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';

/** Традиційні (національні) оцінки України */
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';

/** Тип підсумкового контролю дисципліни */
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';

/** Академічний статус студента */
export type StudentAcademicStatus = 'active' | 'academic_leave' | 'expelled' | 'graduated';

/** Статус виконання завдання */
export type AssignmentSubmissionStatus = 'new' | 'draft' | 'submitted' | 'graded' | 'overdue';

/** Тип навчального заняття */
export type ScheduleEventType =
  'lecture' | 'lab' | 'practice' | 'seminar' | 'consultation' | 'exam';

/** Профіль студента для Картки студента */
export interface StudentProfile {
  id: string | number;
  moodleId: number | string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardNumber: string; // Наприклад, 'КВ №12345678'
  recordBookNumber: string; // Наприклад, 'ЗК-2023-12'
  faculty: string; // Наприклад, 'ННІ комп\'ютерних наук та штучного інтелекту'
  department: string; // Наприклад, 'Кафедра штучного інтелекту та програмної інженерії'
  specialty: string; // Наприклад, '122 Комп\'ютерні науки'
  educationalProgram: string; // Наприклад, 'Комп\'ютерні науки та технології штучного інтелекту'
  degree: 'bachelor' | 'master' | 'phd';
  course: number; // 1..4
  group: string; // Наприклад, 'КС-31'
  studyForm: 'full-time' | 'part-time'; // денна / заочна
  financing: 'budget' | 'contract'; // бюджет / контракт
  status: StudentAcademicStatus;
  gpa: number; // Рейтинговий бал (0..100)
  totalCreditsEarned: number; // Сума кредитів ECTS
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
}

/** Дисципліна індивідуального навчального плану */
export interface CurriculumItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  description?: string;
  credits: number; // Кредити ECTS (наприклад, 4.0)
  hours?: {
    total: number;
    lectures: number;
    practicals: number;
    labs: number;
    selfStudy: number;
  };
  semester: number;
  academicYear: string; // '2025/2026'
  cycle?: 'general' | 'professional' | 'elective';
  controlType: ControlType;
  instructors: Array<{
    id?: number | string;
    name: string;
    email?: string;
    role?: string;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number; // 0..100
  moodleCourseId?: number;
  moodleUrl?: string;
}

/** Запис електронної залікової книжки */
export interface StudentRecordBookItem {
  id: string | number;
  courseId: number;
  courseName: string;
  courseCode?: string;
  credits: number;
  semester: number;
  academicYear: string;
  controlType: ControlType;
  currentScore: number | null; // Поточний контроль (0..60)
  examScore?: number | null; // Екзаменаційний бал (0..40)
  totalScore: number; // Підсумковий бал за 100-бальною шкалою
  ectsGrade: EctsGrade; // 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F'
  traditionalGrade: TraditionalGrade; // 'відмінно' | 'добре' | 'задовільно' | 'зараховано'
  date?: string;
  instructorName?: string;
  isPassed: boolean;
}

/** Альтернативний аліас згідно з ТЗ */
export type GradeRecord = StudentRecordBookItem;

/** Завдання з дедлайном */
export interface AssignmentItem {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description?: string;
  duedate: number; // Unix timestamp у секундах
  duedateIso?: string;
  submissionStatus: AssignmentSubmissionStatus;
  gradingStatus?: 'not_graded' | 'graded';
  grade?: string | number | null;
  maxGrade?: number;
  feedback?: string;
  attachments?: Array<{ name: string; url: string; size?: number }>;
  year?: string | null;
  semester?: number | null;
}

/** Елемент розкладу занять */
export interface ScheduleItem {
  id: string | number;
  courseId?: number;
  title: string;
  type: ScheduleEventType;
  instructor: string;
  location: string;
  onlineLink?: string;
  startTime: string; // '08:30'
  endTime: string; // '10:05'
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekType?: 'all' | 'numerator' | 'denominator';
  date?: string;
}

/** Статус підключення до LMS Moodle */
export interface LmsConnectionStatus {
  host: string; // 'https://moodle.universemvp.tech'
  isConnected: boolean;
  status: 'online' | 'offline' | 'degraded' | 'syncing';
  lastSyncTimestamp: number | string;
  latencyMs?: number;
  userId?: string | number;
  userTokenValid: boolean;
}

/** Функція розрахунку ECTS літери за 100-бальним результатом */
export function calculateEctsGrade(score: number): EctsGrade {
  if (score >= 90) return 'A';
  if (score >= 82) return 'B';
  if (score >= 74) return 'C';
  if (score >= 64) return 'D';
  if (score >= 60) return 'E';
  if (score >= 35) return 'Fx';
  return 'F';
}

/** Функція розрахунку традиційної оцінки */
export function calculateTraditionalGrade(
  score: number,
  controlType: ControlType = 'exam',
): TraditionalGrade {
  if (controlType === 'credit') {
    return score >= 60 ? 'зараховано' : 'не зараховано';
  }
  if (score >= 90) return 'відмінно';
  if (score >= 74) return 'добре';
  if (score >= 60) return 'задовільно';
  return 'незадовільно';
}
```

---

### R2. Публічні експорти дизайн-системи (`@universe/ui`)

Файл `packages/ui/index.ts` повинен повноцінно експортувати всі 11 компонентів:

```typescript
// packages/ui/index.ts
export * from './components/una/Button';
export * from './components/una/Modal';
export * from './components/una/ProgressBar';
export * from './components/una/Tag';
export * from './components/una/Select';

// Input аліаси
export { TextInput as Input, TextInput } from './components/una/inputs/TextInput';
export type {
  TextInputProps as InputProps,
  TextInputProps,
} from './components/una/inputs/TextInput';

// Form аліаси
export { SimpleForm as Form, SimpleForm } from './components/una/Form';
export type { SimpleFormProps as FormProps, SimpleFormProps } from './components/una/Form';

export * from './components/una/Spinner';
export * from './components/una/Skeleton';
export * from './components/una/Toast';
export * from './components/una/Empty';
```

Конфігурація `package.json` (`@universe/ui`):

- Забезпечити скрипти: `"typecheck": "tsc --noEmit"`, `"build": "echo 'Build ready'"`.
- Експорти SCSS-токенів у секції `exports`:
  - `"./vars.scss": "./vars.scss"`
  - `"./breakpoints.scss": "./breakpoints.scss"`

---

### R3. Навігація та подання електронного деканату UniHub (`@universe/uni-hub`)

#### 1. Канонічні навігаційні вкладки:

1. **`«Картка студента / Огляд»`** (`key: 'overview'`)
   - Іконка: `User` або `LayoutDashboard`
   - Функціонал:
     - Блок картки студента: ПІБ, спеціальність (122 «Комп'ютерні науки»), група, форма навчання, номер квитка.
     - Академічний рейтинг (GPA за 100-бальною шкалою) та академічний стан (стипендіальний статус).
     - Блок найближчого дедлайну з лічильником зворотного відліку `LiveCountdown`.
     - Зведені показники семестрового навантаження (загальні ECTS кредити, кількість дисциплін).
2. **`«Індивідуальний план»`** (`key: 'courses'`)
   - Іконка: `BookOpen`
   - Функціонал:
     - Дисципліни семестру: «Об'єктно-орієнтоване програмування», «Алгоритми та структури даних», «Бази даних та інформаційні системи», «Архітектура комп'ютерів» тощо.
     - Відображення ECTS-кредитів, викладачів (лектор, асистент), статус та прогрес освоєння курсу.
     - Кнопка швидкого переходу до навчальних матеріалів Moodle (`/courses/[courseId]/contents`).
3. **`«Заліковка та бали»`** (`key: 'grades'`)
   - Іконка: `ClipboardList`
   - Функціонал:
     - Цифрова залікова книжка студента.
     - Таблиця з колонками: Дисципліна, Кредити, Форма контролю, Поточний контроль (0..60), Екзамен (0..40), Підсумковий 100-бальний результат, Оцінка ECTS (A–F), Національна оцінка («відмінно», «добре», «задовільно», «зараховано»).
     - Графік розподілу успішності `GradesChart` та інтерактивний симулятор `GradeSimulator`.
4. **`«Розклад занять»`** (`key: 'schedule'`)
   - Іконка: `CalendarDays`
   - Функціонал:
     - Тижнева сітка пар Каразінського університету:
       - 1 пара: 08:30 – 10:05
       - 2 пара: 10:20 – 11:55
       - 3 пара: 12:10 – 13:45
       - 4 пара: 14:00 – 15:35
       - 5 пара: 15:50 – 17:25
     - Колірні бейджі: «Лекція» (синій / info), «Лабораторна робота» (бурштиновий / warning), «Практичне заняття» (зелений / success).
     - Перемикання парності: «Чисельник» / «Знаменник».
5. **`«Завдання»`** (`key: 'assignments'`)
   - Іконка: `FileEdit`
   - Функціонал:
     - Стрічка завдань з фільтрами: «Потрібно здати», «Здано на перевірку», «Оцінено», «Прострочено».
     - Картка завдання з таймером дедлайну, модальним вікном здачі робіт (`AssignmentModal`) та переглядом рецензій викладача.

#### 2. Індикатор зв'язку з Moodle у футері сайдбару (`siderFooter`):

- Розміщення: всередині `<div className={styles.siderFooter}>` над кнопкою виходу.
- Розмітка та стиль:
  - Зовнішнє посилання: `<a href="https://moodle.universemvp.tech" target="_blank" rel="noopener noreferrer" className={styles.moodleStatusLink}>`
  - Текст та піктограма: `🔗 moodle.universemvp.tech`
  - Зелений активний індикатор: елемент статусу з класом `.moodleStatusDot` (зелена крапка `8px` із легким сяйвом або `pulse`-анімацією).
  - При згорнутому сайдбарі (`collapsed === true`): відображається компактна цятка з іконкою посилання та спливаючою підказкою.

---

### R4. Узгодження бекенд-шлюзу Moodle (`@universe/backend`)

1. **Конфігурація хоста Moodle**:
   - У `packages/backend/src/moodle/moodle-client/moodle.client.service.ts`:
     Змінити дефолтне значення:
     `process.env.MOODLE_BASEURL || 'https://moodle.universemvp.tech'`
2. **Ендпоінти та відповідність DTO**:
   - `GET /moodle/courses` -> повертає дані дисциплін, що мапляться на `CurriculumItem[]`.
   - `GET /moodle/assignments` -> повертає масив `AssignmentItemDto[]`, адаптований до `AssignmentItem[]`.
   - `GET /moodle/grades` -> повертає `MoodleGradesResponseDto`, що постачає дані для `StudentRecordBookItem[]`.
   - `GET /moodle/events` -> повертає `CalendarEventDto[]`, що живить календар та найближчі події розкладу `ScheduleItem[]`.
3. **Клієнт UniHub API (`packages/uni-hub/src/services/api.ts`)**:
   - Переорієнтувати імпорти типів на `@universe/types`:
     `import type { CurriculumItem, GradeRecord, AssignmentItem, ScheduleItem, LmsConnectionStatus } from '@universe/types';`
   - Забезпечити строгу типізацію методів `getCourses()`, `getGrades()`, `getAssignments()`, `getEvents()`.

---

## 6. Caveats (Застереження та припущення)

1. Інстанс Moodle `https://moodle.universemvp.tech` вимагає валідного студентського або тестового веб-сервіс токена (`wstoken`) для повноцінної інтерактивної відповіді від `webservice/rest/server.php`. При відсутності зв'язку клієнт UniHub повинен мати надійний стан graceful fallback (демонстрація закешованих даних або повідомлення про стан сервера).
2. Розрахунок ECTS літери та традиційної оцінки повинен бути детермінованим на фронтенді, якщо Moodle повертає лише сирий числовий бал `rawgrade`.

---

## 7. Conclusion (Висновки)

1. Усі 4 групи вимог (R1, R2, R3, R4) повністю досліджені, вилучені та структуровані у самодостатній технічний звіт.
2. Пакет `@universe/types` наразі є порожнім і потребує створення файла `src/index.ts` із доменними контрактами, розрахунковими утилітами трьох шкал оцінювання та налаштування `tsconfig.json` / `package.json`.
3. Дизайн-система `@universe/ui` містить усі необхідні компоненти у `components/una/`, для їх експорту необхідно актуалізувати `packages/ui/index.ts`.
4. Сторінка `DashboardPage.tsx` у `packages/uni-hub` готова до переведення на 5 канонічних україномовних вкладок електронного деканату та інтеграції статус-лінка Moodle у `siderFooter`.
5. Бекенд-шлюз у `packages/backend` потребує перемикання дефолтного хоста на `https://moodle.universemvp.tech`.

---

## 8. Verification Method (Метод верифікації)

Для незалежної верифікації правильності реалізації специфікації виконати:

1. Перевірка статичної типізації у всіх 7 пакетах:
   ```powershell
   pnpm.cmd run typecheck
   ```
   _Очікуваний результат_: 0 помилок TypeScript у кожному з 7 пакетів.
2. Перевірка лінтером oxlint:
   ```powershell
   pnpm.cmd run lint
   ```
   _Очікуваний результат_: 0 errors, 0 warnings.
3. Повна збірка monorepo через Turborepo:
   ```powershell
   pnpm.cmd run build
   ```
   _Очікуваний результат_: Успішна збірка всіх 7 пакетів без помилок.
4. Перевірка артефакту специфікації:
   - Ознайомитися з файлом `C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\spec_miner_survey_1\handoff.md`.
