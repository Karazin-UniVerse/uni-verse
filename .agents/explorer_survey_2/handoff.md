# Звіт дослідження стану Backend, API Service, інструментарію та Git репозиторію

**Дата дослідження**: 2026-09-07  
**Дослідник**: Explorer Survey 2  
**Робоча директорія**: `C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\explorer_survey_2`  
**Базовий репозиторій**: `C:\Users\TipTop230\WebstormProjects\uni-verse`

---

## 1. Observation (Фактичні спостереження)

### 1.1. Стан гілки Git та репозиторію

- **Поточна гілка**: `feature/unihub-moodle-shell`
  - Виконано команду: `git status`
  - Результат:
    ```
    On branch feature/unihub-moodle-shell
    Untracked files:
      (use "git add <file>..." to include in what will be committed)
    	.agents/ORIGINAL_REQUEST.md
    	.agents/explorer_survey_1/
    	.agents/explorer_survey_2/
    	.agents/sentinel/
    	.agents/spec_miner_survey_1/
    	.agents/teamwork_preview_orchestrator/
    	ORIGINAL_REQUEST.md

    nothing added to commit but untracked files present (use "git add" to track)
    ```
- **Відстежувані файли**: Робоче дерево чисте, модифікованих або індексованих змін немає.
- **Останній коміт HEAD**: `efc2de5 Merge pull request #63 from Karazin-UniVerse/chore/sync-main-into-develop`.
- **Наявні гілки**: 36 локальних гілок (зокрема `develop`, `main`, `stage/poc-preview`), активною є саме цільова гілка `feature/unihub-moodle-shell`.

### 1.2. Дослідження `packages/backend`

- **Структура модуля Moodle** (`packages/backend/src/moodle`):
  Модуль зареєстровано у `packages/backend/src/moodle/moodle.module.ts` (рядки 20–53), який об'єднує 7 контролерів:
  1. `MoodleController` (`packages/backend/src/moodle/moodle.controller.ts`):
     - `GET /moodle/courses`: приймає параметри `status`, `year`, `semester`. Отримує список курсів через `MoodleCoursesService.getCourses(token, moodleId)` та фільтрує за допомогою `filterCourses(...)` (`src/utils/moodleFilters.ts`).
     - `GET /moodle/grades`: викликає `MoodleGradesService.getGeneralGrades(token, moodleId)`, повертає `MoodleGradesResponseDto`.
  2. `MoodleAssignmentsController` (`packages/backend/src/moodle/moodle-assignments/moodle-assignments.controller.ts`):
     - `GET /moodle/assignments`: фільтрує за `GetAssignmentsQueryDto` (`year`, `semester`, `status`, `dateFrom`, `dateTo`, `sortByDate`), повертає `AssignmentItemDto[]`.
     - `GET /moodle/assignments/:assignId/status`: повертає `SubmissionStatusDto` (`status`, `grade`).
     - `POST /moodle/assignments/:assignId/submission`: зберігає відповідь (`text`, `fileItemId`).
  3. `MoodleEventsController` (`packages/backend/src/moodle/moodle-events/moodle-events.controller.ts`):
     - `GET /moodle/events`: повертає `CalendarEventDto[]`.
  4. `MoodleCourseContentsController` (`packages/backend/src/moodle/moodle-course-contents/moodle-course-contents.controller.ts`):
     - `GET /moodle/courses/:courseId/contents`: повертає секції та модулі навчального курсу.
  5. `MoodleFilesController` (`packages/backend/src/moodle/moodle-files/moodle-files.controller.ts`):
     - `POST /moodle/files/upload`: приймає base64 і завантажує файл у draft area Moodle.
  6. `MoodleNotificationsController` (`packages/backend/src/moodle/moodle-notifications/moodle-notifications.controller.ts`):
     - `GET /moodle/notifications`: сповіщення користувача.
  7. `MoodleStatisticsController` (`packages/backend/src/moodle/moodle-statistics/moodle-statistics.controller.ts`):
     - `GET /moodle/statistics`: повертає статистику `{ total: number }`.

- **Конфігурація Moodle URL (КРИТИЧНА НЕВІДПОВІДНІСТЬ)**:
  Встановлено, що сервіси бекенду жорстко за замовчуванням звертаються до старого домену `https://moodle.karazin.ua`, а не до цільового `https://moodle.universemvp.tech`:
  1. `packages/backend/src/moodle/moodle-client/moodle.client.service.ts` (рядки 23–24):
     ```typescript
     private readonly baseUrl =
       process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';
     ```
  2. `packages/backend/src/moodle/moodle-files/moodle-files.service.ts` (рядок 19):
     ```typescript
     const baseUrl = process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';
     ```
  3. `packages/backend/src/utils/get-creds.ts` (рядок 18):
     ```typescript
     process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';
     ```
  4. Файли оточення:
     - `packages/backend/.env` (рядок 5): `MOODLE_BASEURL="https://moodle.karazin.ua"`
     - `packages/backend/.env.example` (рядок 13): `MOODLE_BASEURL="https://moodle.karazin.ua"`
     - `.env.example` (рядок 13): `MOODLE_BASEURL="https://moodle.karazin.ua"`

- **Використовувані DTO та їх зв'язок з `@universe/types`**:
  - Пакет `packages/types` наразі є порожньою заглушкою. Файл `packages/types/package.json` містить лише скрипти-заглушки (`echo 'No typecheck yet'`), жодного TypeScript-інтерфейсу або скомпільованого контракту не експортовано.
  - Бекенд використовує внутрішні локальні DTO:
    - `MoodleCoursesDto` (`packages/backend/src/moodle/moodle-courses/moodle-courses-dto.ts`): `{ id: number, fullname: string, shortname?: string, progress?: number }`.
    - `MoodleGradeItemDto` (`packages/backend/src/moodle/moodle-grades/moodle-grades-dto.ts`): `{ courseId: number, courseName: string, grade: string, rawGrade: string, year?: string | null, semester?: number | null }`.
      - **Прогалина**: відсутній розрахунок оцінки за 100-бальною шкалою, літери ECTS (A–F) та традиційної української оцінки («відмінно», «добре», «задовільно», «зараховано»).
    - `AssignmentItemDto` (`packages/backend/src/moodle/moodle-assignments/moodle-assignments-dto.ts`): `{ id: number, courseName: string, name: string, duedate: number, description?: string, year?: string | null, semester?: number | null }`.
      - **Прогалина**: у списку завдань відсутній статус здачі (submission status).
    - `CalendarEventDto` (`packages/backend/src/moodle/moodle-events/moodle-events-dto.ts`): `{ id: number, name: string, description?: string, timestart: number, timeduration?: number, eventtype: string, courseName?: string }`.

### 1.3. Дослідження `packages/uni-hub/src/services/api.ts`

- **Комунікація uni-hub з бекендом**:
  - Базовий URL (`API_BASE_URL`):
    ```typescript
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL ||
      (isBrowser && window.location.hostname !== 'localhost'
        ? 'https://p01--backend--jm9qjnmpm4m2.code.run'
        : 'http://localhost:3001');
    ```
  - Механізм запитів: функція `request<T>(endpoint, options, retries = 2, timeoutMs = 10000)`. Забезпечує:
    - Автоматичне додавання Bearer токена з `localStorage.getItem('accessToken')` за умови перевірки безпечного джерела (`isSecureOrLoopback`).
    - Експоненційне повторення запитів (2 спроби, таймаут 10 секунд через `AbortController`).
    - Передачу cookie (`credentials: 'include'`).
- **Ендпоінти, які викликає `api.ts`**:
  - `AuthApi`: `POST /auth/login`, `POST /auth/logout`.
  - `MoodleApi`:
    - `getCourses()` -> `GET /moodle/courses`
    - `getGrades()` -> `GET /moodle/grades`
    - `getAssignments(params)` -> `GET /moodle/assignments` з параметрами фільтрації `buildQueryString(params)`
    - `getEvents()` -> `GET /moodle/events`
    - `getNotifications()` -> `GET /moodle/notifications`
    - `getStatistics()` -> `GET /moodle/statistics`
    - `getCourseContents(courseId)` -> `GET /moodle/courses/${courseId}/contents`
    - `getAssignmentStatus(assignId)` -> `GET /moodle/assignments/${assignId}/status`
    - `submitAssignment(assignId, text, fileItemId)` -> `POST /moodle/assignments/${assignId}/submission`
    - `uploadFile(filename, filebase64)` -> `POST /moodle/files/upload`
- **Очікувані DTO та невідповідності у frontend**:
  - `api.ts` імпортує типи не з `@universe/types`, а з локального файлу `@uni-hub/types` (`packages/uni-hub/src/types.ts`).
  - Фронтенд очікує у `MoodleEvent` поле `formattedtime: string`, тоді як бекенд повертає `timeduration: number`.
  - Жорстко закодоване посилання у `packages/uni-hub/src/components/AssignmentModal.tsx` (рядок 181):
    `https://moodle.karazin.ua/mod/assign/view.php?a=${module.instance}`
  - Невідповідність інтерфейсу та навігації в `DashboardPage.tsx` вимогам деканату (R3):
    - Вкладки навігації (рядки 354–359) мають російськомовні назви («Обзор», «Курсы», «Оценки», «Задания», «Расписание», «События») замість 5 канонічних україномовних вкладок е-деканату.
    - У підвалі бічного меню (`siderFooter`, рядки 765–782) відсутній статусний індикатор підключення Moodle (🔗 `moodle.universemvp.tech` із зеленим маркером).

### 1.4. Інструментарій монорепозиторію та скрипти

- **Склад робочого простору (Workspace)**:
  Файл `pnpm-workspace.yaml` містить:

  ```yaml
  packages:
    - 'configs/*'
    - 'packages/*'
  ```

  Команда `pnpm.cmd ls -r --depth -1` та `turbo` виявили рівно **7 пакетів**:
  1. `@universe/backend` (`packages/backend`)
  2. `@universe/database` (`packages/database`)
  3. `@universe/eslint-config` (`configs/config-eslint`)
  4. `@universe/types` (`packages/types`)
  5. `@universe/typescript-config` (`configs/config-typescript`)
  6. `@universe/ui` (`packages/ui`)
  7. `@universe/uni-hub` (`packages/uni-hub`)
     _(Примітка: директорія `packages/core` містить лише README.md і не є пакетом pnpm)._

- **Результати тестування скриптів з кореневого `package.json`**:
  - `pnpm.cmd run typecheck` (`turbo typecheck`):
    - **Результат**: Виконано успішно (5 tasks successful, 2 cached, 3.22s).
    - Зауваження: `@universe/types`, `@universe/ui` та `@universe/database` наразі запускають echo-заглушки.
  - `pnpm.cmd run lint` (`oxlint --deny-warnings`):
    - **Результат**: Виконано успішно.
    - Статистика: 0 warnings, 0 errors на 194 файлах за 717ms.
  - `pnpm.cmd run build` (`turbo build`):
    - **Результат**: Виконано успішно (18.6s).
    - Prisma Client v5.10.0 згенеровано успішно, NestJS бекенд зібрано, Next.js 16.3.4 (Turbopack) згенерував сторінки (`/`, `/_not-found`, `/courses/[courseId]/contents`, `/login`).
  - `pnpm.cmd run test` (`turbo test`):
    - **Результат**: Виконано успішно (24 test suites, 65 tests passed, 4.01s).
  - **Особливість оточення Windows Powershell**:
    - Прямий виклик `pnpm` блокується політикою виконання скриптів (`PSSecurityException: File pnpm.ps1 cannot be loaded`). Обов'язково слід викликати `pnpm.cmd`.

---

## 2. Logic Chain (Логічний ланцюг обґрунтування)

1. **Гілка та репозиторій**:
   - _Спостереження_: `git status` повертає `On branch feature/unihub-moodle-shell` без модифікованих відстежуваних файлів.
   - _Висновок_: Робоче середовище вже перебуває на цільовій гілці, що повністю відповідає вимозі R4/Acceptance Criteria.

2. **Конфігурація Moodle URL**:
   - _Спостереження_: `MoodleClientService.baseUrl`, `MoodleFilesService`, `get-creds.ts`, а також `.env` та `AssignmentModal.tsx` явно вказують на `https://moodle.karazin.ua`.
   - _Вимога_: Вимога R4 чітко визначає: «Ensure MoodleClientService defaults to https://moodle.universemvp.tech».
   - _Висновок_: Потрібно замінити значення за замовчуванням у зазначених сервісах бекенду, оновити `.env` / `.env.example`, а також посилання у компоненті `AssignmentModal.tsx`.

3. **Розподіл типів та спільні контракти**:
   - _Спостереження_: `packages/types` не містить жодного вихідного коду або типів, а `packages/backend/package.json` та `packages/uni-hub/package.json` не мають залежності `"@universe/types": "workspace:*"`. Натомість обидва пакети дублюють інтерфейси локально.
   - _Вимога_: Вимога R1 та R4 вимагають зробити `@universe/types` єдиним джерелом істини (Single Source of Truth) для моделей `StudentProfile`, `Course` / `CurriculumItem`, `GradeRecord` / `StudentRecordBookItem`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus`.
   - _Висновок_: Необхідно наповнити `packages/types`, налаштувати експорт `.d.ts` через `tsc -b` або подібне, підключити `@universe/types` до `backend` та `uni-hub`, і типізувати ендпоінти відповідно до спільних контрактів.

4. **Залікова книжка та оцінки (Grades)**:
   - _Спостереження_: Наразі `MoodleGradesService` повертає сирий рядок оцінки `grade` та `rawGrade`. В інтерфейсі `DashboardPage.tsx` оцінки відображаються лише двома колонками (Курс, Оцінка) без конвертації.
   - _Вимога_: Заліковка має відображати 100-бальну шкалу, літеру ECTS (A–F) та традиційну оцінку («відмінно», «добре», «задовільно», «зараховано»).
   - _Висновок_: Доцільно додати конвертер/хелпер шкали оцінювання (в `@universe/types` або утиліти), який за числовим балом генерує тріаду (бал / ECTS / традиційна оцінка), та оновити таблицю заліковки в `DashboardPage.tsx`.

5. **Інтеграція Design System (@universe/ui)**:
   - _Спостереження_: `packages/ui/index.ts` має лише `export {};`, тоді як повноцінна бібліотека компонентів Una розташована у `packages/ui/components/una`. У `uni-hub` компоненти імпортуються через нестандартний аліас `@una` замість публічного пакета `@universe/ui`.
   - _Вимога_: Вимога R2 вимагає реекспортувати всі компоненти Una UI з кореневого `packages/ui/index.ts` та споживати їх у `uni-hub` із `@universe/ui`.
   - _Висновок_: Необхідно оновити `packages/ui/index.ts`, додавши експорт компонентів та токенів SCSS, і перемкнути імпорти у `uni-hub`.

---

## 3. Caveats (Застереження та обмеження)

1. **Обмеження середовища Windows**: Виконання скриптів `.ps1` заблоковано на рівні операційної системи. Будь-які запуски CLI (pnpm, turbo, nest, prisma) мають виконуватись виключно через `.cmd` (`pnpm.cmd`).
2. **Невідповідність версій Prisma**: Логи білду сигналізують: `warn Versions of prisma@5.22.0 and @prisma/client@5.10.0 don't match`. Наразі це не призводить до збою білду чи тестів, проте вимагає обережності під час роботи зі схемою БД.
3. **Moodle Web Services у режимі розробки**: Живе з'єднання з `https://moodle.universemvp.tech` вимагає дійсного `moodleToken`. За відсутності зв'язку сервіси бекенду повертають порожні масиви (graceful fallback через `catch`), що забезпечує стабільність UI навіть офлайн.

---

## 4. Conclusion (Висновки та план дій для реалізації)

У ході дослідження встановлено повну картину поточної архітектури та сформовано точний план дій для наступних етапів:

1. **Git**: Поточна гілка `feature/unihub-moodle-shell` відповідає вимогам. Усі подальші зміни залишатимуться в цій гілці.
2. **Спільні типи (`@universe/types`)**:
   - Створити файли моделей у `packages/types/src/`:
     - `student.ts`: `StudentProfile`
     - `course.ts`: `Course`, `CurriculumItem`
     - `grade.ts`: `GradeRecord`, `StudentRecordBookItem`, типи для 100-бальної шкали, ECTS (`A` | `B` | `C` | `D` | `E` | `FX` | `F`) та традиційної шкали
     - `assignment.ts`: `AssignmentItem`
     - `schedule.ts`: `ScheduleItem`
     - `lms.ts`: `LmsConnectionStatus`
   - Налаштувати `package.json` та `tsconfig.json` у `packages/types` для коректного експорту типів.
   - Додати `"@universe/types": "workspace:*"` до `packages/backend/package.json` та `packages/uni-hub/package.json`.
3. **Бекенд (`packages/backend`)**:
   - Змінити дефолтну URL-адресу з `https://moodle.karazin.ua` на `https://moodle.universemvp.tech` у `MoodleClientService`, `MoodleFilesService`, `get-creds.ts`, `.env` та `.env.example`.
   - Збагатити DTO оцінок полями шкали ECTS та традиційної оцінки (або реалізувати хелпер обчислення).
4. **Дизайн-система (`packages/ui`)**:
   - Експортувати повний набір компонентів (`Button`, `Modal`, `ProgressBar`, `Tag`, `Select`, `Input`, `Form`, `Spinner`, `Skeleton`, `Toast`, `Empty`) з `packages/ui/index.ts`.
5. **Фронтенд (`packages/uni-hub`)**:
   - Оновити `services/api.ts` для типізації через `@universe/types`.
   - Замінити посилання у `AssignmentModal.tsx` на `https://moodle.universemvp.tech`.
   - Оновити навігаційні вкладки в `DashboardPage.tsx` на 5 канонічних україномовних розділів:
     1. «Картка студента / Огляд»
     2. «Індивідуальний план»
     3. «Заліковка та бали»
     4. «Розклад занять»
     5. «Завдання»
   - Додати в `siderFooter` індикатор: 🔗 `moodle.universemvp.tech` з активним зеленим маркером підключення.
   - Оновити подання заліковки (100 балів + ECTS + традиційна оцінка).

---

## 5. Verification Method (Методологія незалежної верифікації)

Для незалежної верифікації стану системи та результатів виконаного аудиту використовувати такі команди:

1. **Перевірка гілки Git**:

   ```powershell
   git status
   git branch --show-current
   ```

   _Очікуваний результат_: `feature/unihub-moodle-shell`.

2. **Перевірка конфігурації URL Moodle**:

   ```powershell
   git grep -n "moodle.karazin.ua" packages/
   ```

   _Поточний результат_: виявлено входження у `moodle.client.service.ts`, `moodle-files.service.ts`, `get-creds.ts`, `AssignmentModal.tsx`. Після виправлення команда не повинна повертати жодного входження (або повертати лише `moodle.universemvp.tech`).

3. **Перевірка лінтера Oxlint**:

   ```powershell
   pnpm.cmd run lint
   ```

   _Очікуваний результат_: `Found 0 warnings and 0 errors.`

4. **Перевірка типів TypeScript по всьому монорепозиторію**:

   ```powershell
   pnpm.cmd run typecheck
   ```

   _Очікуваний результат_: Успішне проходження без помилок (код виходу 0).

5. **Перевірка запусків юніт-тестів бекенду**:

   ```powershell
   pnpm.cmd run test
   ```

   _Очікуваний результат_: 24 тестові набори, 65 тестів пройдено успішно.

6. **Повна збірка проєкту**:
   ```powershell
   pnpm.cmd run build
   ```
   _Очікуваний результат_: Успішна збірка Prisma, NestJS та Next.js 16.3.4 Turbopack.
