# Звіт архітектурного дослідження packages/types, packages/ui та packages/uni-hub

## 1. Observation (Безпосередні спостереження)

### 1.1. Monorepo Configuration та робочий простір

- **Конфігурація робочих просторів** (`pnpm-workspace.yaml`, рядки 1–4):
  ```yaml
  packages:
    - 'configs/*'
    - 'packages/*'
  ```
- **Пакетний менеджер та скрипти кореня** (`package.json`, рядки 4–19, 21–28):
  - Пакетний менеджер: `pnpm@10.0.0`.
  - Скрипти: `turbo dev`, `turbo build`, `oxlint --deny-warnings` (`lint`, `lint:ox`), `turbo typecheck`, `turbo test`, `prettier --write .`.
- **Конфігурація Turborepo** (`turbo.json`, рядки 3–23):
  - Завдання: `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`), `lint` (dependsOn `^lint`), `typecheck` (dependsOn `^typecheck`), `test` (dependsOn `^test`).
- **Склад робочого простору** (виявлено 7 пакетів, підтверджено виведенням `turbo typecheck` та `turbo build`):
  1. `@universe/eslint-config` (`configs/config-eslint`)
  2. `@universe/typescript-config` (`configs/config-typescript`)
  3. `@universe/backend` (`packages/backend`)
  4. `@universe/database` (`packages/database`)
  5. `@universe/types` (`packages/types`)
  6. `@universe/ui` (`packages/ui`)
  7. `@universe/uni-hub` (`packages/uni-hub`)
     _(Примітка: каталоги `configs/oxlint` та `packages/core` не містять `package.json` і не є активними npm-пакетами)._

### 1.2. Пакет packages/types

- **Файлова структура каталогу** `packages/types`:
  - Наявні виключно: `.turbo/`, `node_modules/`, `package.json`.
  - Каталог `src/`, файли `index.ts`, будь-які `.ts` файли та `tsconfig.json` **відсутні**.
- **Вміст `packages/types/package.json`** (повний вміст):
  ```json
  {
    "name": "@universe/types",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "lint": "echo 'No lint yet'",
      "typecheck": "echo 'No typecheck yet'",
      "build": "echo 'No build step for types yet'"
    },
    "devDependencies": {
      "typescript": "^5.0.0"
    }
  }
  ```
- **Статус експорту**:
  - Поля `main`, `types`, `exports` у `package.json` відсутні.
  - Жодного контракту наразі не експортовано.
  - Потребує наповнення згідно з R1: `StudentProfile`, `Course` / `CurriculumItem`, `GradeRecord` / `StudentRecordBookItem` (100-бальна шкала + оцінка ECTS + традиційна оцінка), `AssignmentItem` (дедлайн та статус здачі), `ScheduleItem`, `LmsConnectionStatus`.

### 1.3. Пакет packages/ui

- **Файлова структура каталогу** `packages/ui`:
  - `components/una/`: реалізація Una UI дизайн-системи.
  - `components/complex/`: містить тестовий файл `example.tsx`.
  - `vars.scss` (13 917 байт) та `breakpoints.scss` (785 байт) розташовані безпосередньо в корені `packages/ui/` (окремого каталогу `styles/` чи `src/` немає).
  - `index.ts`: вхідна точка публічних експортів.
  - `package.json`, `vitest.config.ts`, `vitest.shims.d.ts`, `.storybook/`.
  - Файл `tsconfig.json` у `packages/ui` **відсутній**.
- **Вміст `packages/ui/index.ts`** (рядки 1–4):
  ```typescript
  // Public exports for @universe/ui
  // export * from './components/complex';
  // export * from './hooks';
  export {};
  ```
  Жоден компонент наразі публічно не експортується.
- **Вміст `packages/ui/package.json`** (секція експортів та залежностей, рядки 12–28):
  ```json
  "main": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./una": "./components/una/index.ts",
    "./una/*": "./components/una/*",
    "./vars.scss": "./vars.scss",
    "./breakpoints.scss": "./breakpoints.scss"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^1.39.0",
    "sass": "^1.103.1"
  },
  "peerDependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  }
  ```
- **Інвентаризація 11 компонентів з вимоги R2**:
  1. `Button` — існує (`packages/ui/components/una/Button/Button.tsx`, `Button.types.ts`).
  2. `Modal` — існує (`packages/ui/components/una/Modal/Modal.tsx`, `Modal.types.ts`).
  3. `ProgressBar` — існує (`packages/ui/components/una/ProgressBar/ProgressBar.tsx`, `ProgressBar.types.ts`).
  4. `Tag` — існує (`packages/ui/components/una/Tag/Tag.tsx`, `Tag.types.ts`).
  5. `Select` — існує (`packages/ui/components/una/Select/Select.tsx`, `Select.types.ts`).
  6. `Input` — існує під назвою `TextInput` (`packages/ui/components/una/inputs/TextInput/TextInput.tsx`, `TextInput.types.ts`). Потребує аліасу експорту: `export { TextInput as Input, type TextInputProps as InputProps }`.
  7. `Form` — існує під назвою `SimpleForm` (`packages/ui/components/una/Form/SimpleForm.tsx`, `SimpleForm.types.ts`). Потребує аліасу експорту: `export { SimpleForm as Form, type SimpleFormProps as FormProps }`.
  8. `Spinner` — існує (`packages/ui/components/una/Spinner/Spinner.tsx`, `Spinner.types.ts`).
  9. `Skeleton` — існує (`packages/ui/components/una/Skeleton/Skeleton.tsx`, `Skeleton.types.ts`).
  10. `Toast` — існує у вигляді `ToastProvider` та хука `useToast` (`packages/ui/components/una/Toast/Toast.tsx`, `Toast.types.ts`). Потребує експорту з `index.ts`.
  11. `Empty` — існує (`packages/ui/components/una/Empty/Empty.tsx`, `Empty.types.ts`).

### 1.4. Пакет packages/uni-hub

- **Архітектура маршрутизації**:
  - Next.js 16.3.4 з **App Router** (`packages/uni-hub/src/app/`).
  - Сторінки:
    - `src/app/page.tsx`: рендерить `DashboardPage` під `Suspense` з `DashboardSkeleton`.
    - `src/app/courses/[courseId]/contents/page.tsx`: рендерить `CourseContents`.
    - `src/app/login/page.tsx`: рендерить `LoginPage`.
    - `src/app/layout.tsx`: кореневий макет із підключенням шрифтів Geist та глобальних стилів (`@ui/vars.scss`, `@uni-hub/index.css`, `./globals.css`).
- **Залежності `packages/uni-hub/package.json`**:
  - Рядок 13: `"@universe/ui": "workspace:*"` **присутній** у `dependencies`.
  - Залежність `"@universe/types"` **відсутня** як у `dependencies`, так і в `devDependencies`.
- **Конфігурація `packages/uni-hub/tsconfig.json`** (рядки 21–26):
  ```json
  "paths": {
    "@uni-hub/*": ["./src/*"],
    "@ui/*": ["./src/components/ui/*", "../ui/components/una/*", "../ui/*"],
    "@una": ["../ui/components/una/index.ts"],
    "@una/*": ["../ui/components/una/*"]
  }
  ```
  Через порожній `packages/ui/index.ts` проєкт наразі звертається до UI-компонентів через шляхові аліаси `@una` та `@ui/*`.
- **Поточний стан вкладок навігації** (`DashboardPage.tsx`, рядки 69–71, 353–360):
  - Визначено 6 вкладок російською мовою замість 5 канонічних українських з R3:
    1. `overview`: `label: 'Обзор'`, іконка `<LayoutDashboard size={18} />`.
    2. `courses`: `label: 'Курсы'`, іконка `<BookOpen size={18} />`.
    3. `grades`: `label: 'Оценки'`, іконка `<ClipboardList size={18} />`.
    4. `assignments`: `label: 'Задания'`, іконка `<FileEdit size={18} />`.
    5. `schedule`: `label: 'Расписание'`, іконка `<CalendarDays size={18} />`.
    6. `events`: `label: 'События'`, іконка `<Calendar size={18} />`.
  - Згідно з R3 вимагаються 5 канонічних українських вкладок:
    1. «Картка студента / Огляд» (overview)
    2. «Індивідуальний план» (courses)
    3. «Заліковка та бали» (grades)
    4. «Розклад занять» (schedule)
    5. «Завдання» (assignments)
- **Реалізація бічної панелі (Sidebar) та її підвалу (siderFooter)**:
  - Реалізовано у `DashboardPage.tsx` через тег `<aside ref={siderRef} id="dashboard-sidebar" className={styles.sider}>` (рядки 724–783).
  - Підтримує згортання (`collapsed`) та мобільну версію з оверлеєм (`mobileMenuOpen`).
  - Підвал сайдбару розміщений у `<div className={styles.siderFooter}>` (рядки 765–782) і містить:
    ```tsx
    <div className={styles.siderFooter}>
      <ThemeSwitcher compact showLabel={!collapsed || mobileMenuOpen} className={styles.themeBtn} />
      <SimpleButton
        type="button"
        variant="secondary"
        size="medium"
        isTransparent
        onClick={handleLogout}
        className={styles.logoutBtn}
      >
        <LogOut size={18} />
        {(!collapsed || mobileMenuOpen) && <span>Выйти</span>}
      </SimpleButton>
    </div>
    ```
  - **Індикатор Moodle відсутній**: посилання `🔗 moodle.universemvp.tech` з зеленим активним індикатором статусу наразі не реалізовано.
- **Стан ключових модулів та представлень у `packages/uni-hub`**:
  - _Картка студента / Огляд_: У шапці наявний статичний лейбл «Студент» з іконкою `User`. У `renderOverview()` відображаються `ContextualGreeting` («Доброе утро/день/вечер»), `StreakBadge`, `nearestDeadline` з `LiveCountdown`, картки кількості курсів/завдань, донат-чарт `AssignmentsDonut`, списки останніх курсів та подій. Повна картка студента (група, факультет, спеціальність, академічний статус, кредити) відсутня.
  - _Індивідуальний план (Курси)_: `renderCourses()` відображає сітку курсів із `moodleApi.getCourses()`, тегом `shortname` та кнопкою «Просмотр контента», що веде на `/courses/${course.id}/contents` (`CourseContents.tsx` з переліком модулів). Не містить розподілу кредитів ECTS, викладачів та академічного плану.
  - _Заліковка та бали (Оцінки)_: `renderGrades()` містить `GradeSimulatorTrigger` (виклик `GradeSimulator`), гістограму `GradesChart` та таблицю з `g.grade` і прогрес-баром. Не відповідає вимогам електронної заліковки (відсутні поля 100-бальної шкали, літери ECTS A–F, традиційної оцінки «відмінно»/«добре»/«задовільно»/«зараховано»).
  - _Розклад занять_: Компонент `<ScheduleView />` (`src/components/ScheduleView.tsx`) підтримує режими дня/тижня/місяця та експорт у формат `.ics`, проте оперує моковими даними російською мовою (`DUMMY_EVENTS`: «Математика», «Физика»).
  - _Завдання_: `renderAssignments()` містить фільтри за датою, порядком сортування та статусом виконання, відкриває модальне вікно `AssignmentModal` (`src/components/AssignmentModal.tsx`) з можливістю здачі тексту чи завантаження файлу.

### 1.5. Стан контрактів бекенду (@universe/backend)

- `packages/backend/src/moodle/moodle.controller.ts` надає ендпоінти:
  - `GET /moodle/courses`: повертає масив курсів із можливістю фільтрації за `status`, `year`, `semester`.
  - `GET /moodle/grades`: повертає `MoodleGradesResponseDto` зі списком `MoodleGradeItemDto` (`courseId`, `courseName`, `grade`, `rawGrade`, `year`, `semester`).
- `packages/backend/package.json`:
  - Містить `"@universe/database": "workspace:*"`.
  - Залежність `"@universe/types"` наразі **відсутня**.

---

## 2. Logic Chain (Логічний ланцюг міркувань)

1. **Відсутність єдиного джерела типів**:
   - _Спостереження_: `packages/types` містить лише порожній `package.json`, тоді як `packages/uni-hub/src/types.ts` та `packages/backend/src/moodle/**/dto.ts` самостійно й фрагментарно описують моделі (`Course`, `Grade`, `Assignment`, `MoodleEvent`).
   - _Висновок_: Необхідно наповнити `packages/types/src/index.ts` повним набором спільних моделей згідно з R1 (`StudentProfile`, `Course`/`CurriculumItem`, `GradeRecord`/`StudentRecordBookItem`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus`), налаштувати `tsconfig.json` та додати експорт пакету для `workspace:*`.

2. **Ізольованість дизайн-системи @universe/ui**:
   - _Спостереження_: У `packages/ui` всі 11 компонентів з вимоги R2 вже імплементовані в каталозі `components/una/` (зокрема `TextInput` як відповідник `Input` та `SimpleForm` як відповідник `Form`), проте `packages/ui/index.ts` має лише `export {};`. Через це `uni-hub` використовує прямі відносні аліаси `@una` та `@ui/*` замість стандартного імпорту `@universe/ui`.
   - _Висновок_: Наповнення `packages/ui/index.ts` реекспортом компонентів (із наданням аліасів `export { TextInput as Input }` та `export { SimpleForm as Form }`), експорт `ToastProvider`/`useToast` і додавання експортів токенів забезпечить легітимне використання `@universe/ui` у `uni-hub`.

3. **Локалізація та навігаційна відповідність E-Dean**:
   - _Спостереження_: У `DashboardPage.tsx` поточний масив `menuItems` налічує 6 вкладок із російськими назвами (`'Обзор'`, `'Курсы'`, `'Оценки'`, `'Задания'`, `'Расписание'`, `'События'`). У підвалі `siderFooter` немає згадки про статус підключення до Moodle.
   - _Висновок_: Для виконання вимоги R3 необхідно перевести навігацію на 5 канонічних вкладок українською мовою:
     1. «Картка студента / Огляд» (`overview`)
     2. «Індивідуальний план» (`courses`)
     3. «Заліковка та бали» (`grades`)
     4. «Розклад занять» (`schedule`)
     5. «Завдання» (`assignments`)
        А також інтегрувати в `siderFooter` клікабельний індикатор з посиланням на `https://moodle.universemvp.tech` та зеленим світлодіодом статусу.

4. **Розширення структури оцінок під формат української заліковки**:
   - _Спостереження_: `renderGrades()` та `getValidGrades()` відображають тільки одне строкове поле `grade` з Moodle.
   - _Висновок_: Необхідно трансформувати виведення оцінок, розрахувавши або транслюючи 100-бальний бал у літеру ECTS (A: 90-100, B: 82-89, C: 74-81, D: 64-73, E: 60-63, F/FX: 0-59) та традиційну національну оцінку («відмінно», «добре», «задовільно», «незадовільно» або «зараховано»).

---

## 3. Caveats (Застереження та обмеження)

1. **Відсутність tsconfig.json у packages/types та packages/ui**:
   - Наразі обидва пакети мають заглушки в `package.json` (`"typecheck": "echo 'No typecheck yet'"`). Після створення файлів конфігурації TypeScript перевірку `pnpm.cmd run typecheck` слід запустити для верифікації сумісності з React 19 та опціями компілятора.
2. **Аліаси компонентів Una UI**:
   - В Una UI текстовий інпут має назву `TextInput`, а форма — `SimpleForm`. Для уникнення регресій у коді, що вже використовує старі імена, в `packages/ui/index.ts` слід експортувати як канонічні назви R2 (`Input`, `Form`), так і первинні (`TextInput`, `SimpleForm`).
3. **Робота без активного підключення до реального Moodle**:
   - У тестовому середовищі за відсутності з'єднання з мережею або доступу до `https://moodle.universemvp.tech` інтерфейс має коректно відображати стан завантаження, фолбеки та повідомлення без падіння збірки.

---

## 4. Conclusion (Висновки та план дій для реалізації)

1. **Пакет `@universe/types`**:
   - Створити `tsconfig.json` з розширенням `@universe/typescript-config/base.json`.
   - Оновити `packages/types/package.json`: вказати `"main": "./src/index.ts"`, `"types": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`, скрипт `"typecheck": "tsc --noEmit"`.
   - Створити `packages/types/src/index.ts` із моделями: `StudentProfile`, `Course`, `CurriculumItem`, `GradeRecord`, `StudentRecordBookItem`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus`.
2. **Пакет `@universe/ui`**:
   - Створити `tsconfig.json` у `packages/ui` для валідації типізації.
   - Оновити `packages/ui/index.ts`: експортувати `Button`, `Modal`, `ProgressBar`, `Tag`, `Select`, `Spinner`, `Skeleton`, `Empty`, `ToastProvider`, `useToast` (та аліас `Toast`), `TextInput as Input`, `SimpleForm as Form`.
   - Перевірити доступність імпортів стилів `./vars.scss` та `./breakpoints.scss`.
3. **Пакет `@universe/uni-hub`**:
   - Додати `"@universe/types": "workspace:*"` до `packages/uni-hub/package.json`.
   - Замінити внутрішні локальні типи у `src/services/api.ts` та компонентах на контракти з `@universe/types`.
   - Замінити шляхові імпорти `@una` та `@ui/*` на офіційний `@universe/ui`.
   - Оновити меню у `DashboardPage.tsx` на 5 канонічних українських вкладок.
   - Додати в `DashboardPage.tsx` індикатор підключеного Moodle у `siderFooter` (посилання `moodle.universemvp.tech` із зеленим маркером).
   - Модернізувати відображення картки студента, курсів індивідуального плану та цифрової заліковки (100 балів, ECTS, традиційна оцінка).
4. **Бекенд `@universe/backend`**:
   - Підключити `"@universe/types": "workspace:*"` до `packages/backend/package.json`.

---

## 5. Verification Method (Методи верифікації)

Команди для незалежної перевірки стану монорепозиторію:

1. **Перевірка типів у всіх 7 пакетах**:

   ```powershell
   pnpm.cmd run typecheck
   ```

   _Критерій проходження_: 0 помилок типізації у виведенні `turbo typecheck`.

2. **Статичний аналіз коду (Oxlint)**:

   ```powershell
   pnpm.cmd run lint
   ```

   _Критерій проходження_: `Found 0 warnings and 0 errors`.

3. **Повна збірка проєкту**:

   ```powershell
   pnpm.cmd run build
   ```

   _Критерій проходження_: Успішна генерація Prisma Client, компіляція NestJS backend та збірка Next.js uni-hub (`Tasks: 5 successful, 5 total`).

4. **Інспекція файлів**:
   - `packages/types/package.json` та `packages/types/src/index.ts`.
   - `packages/ui/index.ts` та наявність експортів 11 компонентів.
   - `packages/uni-hub/src/views/DashboardPage.tsx` (наявність 5 вкладок та Moodle-індикатора).
