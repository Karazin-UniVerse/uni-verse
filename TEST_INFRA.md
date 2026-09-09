# Test Infrastructure & Opaque-Box Test Suite Architecture

Цей документ визначає архітектуру тестового комплексу (E2E Opaque-Box Test Suite) для проєкту UniHub E-Dean's Office & Moodle Integration Layer в репозиторії `uni-verse`.

---

## 1. Test Architecture & Runner Invocation

### 1.1. Harness Design

Тестова інфраструктура розроблена за принципами **Opaque-Box Testing** (тестування на основі специфікації без прив'язки до внутрішньої реалізації) та **Progressive Testability** (прогресивна перевірюваність на етапах життєвого циклу). Тестовий комплекс ізольований у директорії `tests/e2e/` і покриває міжпакетні контракти, публічні інтерфейси, клієнтські сервіси та UI-компоненти.

Ключові компоненти інфраструктури:

- **Test Runner**: Vitest 5.0.0 (використовує нативний Node.js v24 та Rolldown-трансформатор).
- **Конфігурація**: `tests/e2e/vitest.config.mjs` із кореневим шляхом до всього монорепозиторію (`root: ../..`).
- **Test Helpers & Oracles**: `tests/e2e/test-helpers.ts` — уніфіковані допоміжні функції для завантаження модулів, валідації DTO, перевірки експортів, парсингу AST та еталонних розрахунків.

### 1.2. Команди запуску (Runner Invocations)

Тести виконуються з кореня репозиторію `C:\Users\TipTop230\WebstormProjects\uni-verse`:

```bash
# Прямий запуск через Node.js (Vitest)
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs

# Запуск через pnpm.cmd
pnpm.cmd --filter @universe/ui exec vitest run --config ../../tests/e2e/vitest.config.mjs

# Запуск окремого рівня (Tier)
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier1-feature-coverage/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier2-boundary-corner-cases/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier3-cross-feature-combinations/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier4-real-world-scenarios/
```

---

## 2. Чотирирівнева модель тестування (4-Tier Test Pyramid)

| Tier                                   | Призначення                                                                  | Кількість тестів | Покриття функціоналу                               |
| -------------------------------------- | ---------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| **Tier 1: Feature Coverage**           | Покриття основного функціоналу кожного компонента (>=5 на фічу)              | >= 60            | F1, F2, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13 |
| **Tier 2: Boundary & Corner Cases**    | Граничні значення, аномалії, помилкові типи, екстремальні дані (>=5 на фічу) | >= 60            | F1, F2, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13 |
| **Tier 3: Cross-Feature Combinations** | Міжмодульна взаємодія та узгодженість контрактів                             | >= 10            | Інтеграційні ланцюжки F1-F13                       |
| **Tier 4: Real-World Scenarios**       | Повні користувацькі сценарії (End-to-End User Journeys)                      | >= 5             | Реальні академічні процеси Karazin E-Dean          |

---

## 3. Деталізація тестових рівнів

### Tier 1: Feature Coverage (>= 5 тестів на кожну фічу)

1. **Feature 1: Shared Core Domain Models (`@universe/types`)**
   - `StudentProfile`: наявність обов'язкових полів (id, moodleId, fullName, academicStanding, gpa тощо).
   - `CurriculumItem`: наявність полів навчального плану (credits, controlType, instructors, progress).
   - `StudentRecordBookItem / GradeRecord`: поля залікової книжки (currentScore, examScore, totalScore, ectsGrade, traditionalGrade).
   - `AssignmentItem`: поля завдань Moodle (duedate, submissionStatus, gradingStatus).
   - `ScheduleItem` та `LmsConnectionStatus`: поля розкладу пар та статусу підключення шлюзу Moodle.

2. **Feature 2: Grade & ECTS Scale Calculation Utilities (`@universe/types`)**
   - Розрахунок оцінки 'A' (90–100 балів).
   - Розрахунок оцінок 'B', 'C', 'D', 'E' (60–89 балів).
   - Розрахунок оцінок 'Fx' та 'F' (0–59 балів).
   - Традиційна оцінка для іспиту/дифзаліку («відмінно», «добре», «задовільно», «незадовільно»).
   - Традиційна оцінка для заліку («зараховано», «не зараховано»).

3. **Feature 4: Design System 11 Component Public Exports (`@universe/ui`)**
   - Експорт компонентів діалогу та дій: `Button`, `Modal`.
   - Експорт компонентів візуалізації стану: `ProgressBar`, `Tag`, `Spinner`, `Skeleton`.
   - Експорт компонентів вибору та вводу: `Select`, `Input` (`TextInput`).
   - Експорт компонентів форм та зворотного зв'язку: `Form` (`SimpleForm`), `Toast`, `Empty`.
   - Доступність експортів через кореневий `packages/ui/index.ts`.

4. **Feature 5: SCSS Design Tokens Public Exports (`@universe/ui`)**
   - Експорт `./vars.scss` у `package.json` та існування файлу.
   - Експорт `./breakpoints.scss` у `package.json` та існування файлу.
   - Наявність ключових колірних та типографічних змінних у `vars.scss`.
   - Наявність адаптивних точок зупинки (mobile, tablet, desktop) у `breakpoints.scss`.
   - Можливість підключення SCSS-файлів споживачами робочого простору.

5. **Feature 6: Backend Moodle Gateway Host Alignment (`@universe/backend`)**
   - `MoodleClientService`: значення baseUrl за замовчуванням дорівнює `https://moodle.universemvp.tech`.
   - `MoodleClientService`: обов'язкова перевірка протоколу https://.
   - `moodle-files.service.ts`: хост за замовчуванням `https://moodle.universemvp.tech`.
   - `get-creds.ts`: хост за замовчуванням `https://moodle.universemvp.tech`.
   - `.env.example` та `.env`: значення `MOODLE_BASEURL=https://moodle.universemvp.tech`.

6. **Feature 7: Backend DTOs Alignment with `@universe/types` (`@universe/backend`)**
   - Відповідність ендпоінта `/moodle/courses` контракту `CurriculumItem[]`.
   - Відповідність ендпоінта `/moodle/assignments` контракту `AssignmentItem[]`.
   - Відповідність ендпоінта `/moodle/grades` контракту `StudentRecordBookItem[]`.
   - Відповідність ендпоінта `/moodle/events` контракту `ScheduleItem[]`.
   - Валідація типів полів у DTO відповідях контролерів.

7. **Feature 8: UniHub Package Dependencies & Imports Alignment (`@universe/uni-hub`)**
   - Наявність `@universe/types` у `packages/uni-hub/package.json` (`workspace:*`).
   - Наявність `@universe/ui` у `packages/uni-hub/package.json` (`workspace:*`).
   - Відсутність некоректних відносних імпортів повз пакетні точки входу.
   - Правильне резолвлення типів у конфігурації `tsconfig.json`.
   - Сумісність версій спільних залежностей.

8. **Feature 9: UniHub API Service Alignment (`@universe/uni-hub`)**
   - `moodleApi.getCourses` повертає типізовані `Course[]` / `CurriculumItem[]`.
   - `moodleApi.getGrades` повертає типізовані `Grade[]` / `StudentRecordBookItem[]`.
   - `moodleApi.getAssignments` повертає типізовані `Assignment[]` / `AssignmentItem[]`.
   - `moodleApi.getEvents` повертає типізовані `MoodleEvent[]` / `ScheduleItem[]`.
   - Коректне формування параметрів запиту `buildQueryString`.

9. **Feature 10: E-Dean 5 Canonical Ukrainian Tabs (`@universe/uni-hub`)**
   - Наявність вкладки 1: «Картка студента / Огляд» (key: `overview`).
   - Наявність вкладки 2: «Індивідуальний план» (key: `courses`).
   - Наявність вкладки 3: «Заліковка та бали» (key: `grades`).
   - Наявність вкладки 4: «Розклад занять» (key: `schedule`).
   - Наявність вкладки 5: «Завдання» (key: `assignments`).
   - Повна відсутність застарілих російськомовних назв («Обзор», «Курсы», «Оценки»).

10. **Feature 11: Sidebar Footer Moodle Status Indicator (`@universe/uni-hub`)**
    - Наявність посилання на Moodle у контейнері `siderFooter`.
    - Текст/іконка посилання: `🔗 moodle.universemvp.tech`.
    - Атрибут `href="https://moodle.universemvp.tech"`.
    - Наявність активного зеленого індикатора підключення (status dot).
    - Наявність атрибутів безпеки `target="_blank"` та `rel="noopener noreferrer"`.

11. **Feature 12: Digital Gradebook 3-Tier Grade Display (`@universe/uni-hub`)**
    - Відображення 100-бальної шкали (числовий бал, наприклад, 95/100).
    - Відображення літери ECTS шкали (A, B, C, D, E, Fx, F).
    - Відображення традиційної української оцінки («відмінно», «добре», «задовільно», «зараховано»).
    - Заголовки стовпців таблиці державною мовою.
    - Відображення індикатора прогресу з відповідним кольоровим тоном.

12. **Feature 13: Fix Hardcoded Legacy URLs in UniHub (`@universe/uni-hub`)**
    - `AssignmentModal.tsx`: посилання на оригінальне завдання вказує на `moodle.universemvp.tech`.
    - Відсутність входжень застарілого домену `moodle.karazin.ua` у коді `packages/uni-hub/src/`.
    - Коректне відкриття зовнішніх посилань із параметрами `instance`.
    - Завантаження файлів додатків через оновлений домен.
    - Безпечна конкатенація токена доступу.

---

### Tier 2: Boundary & Corner Cases (>= 5 тестів на кожну фічу)

- **F1 (Models)**: Обробка відсутності необов'язкових полів (`null` для examScore, порожній масив викладачів, крайові значення академічного статусу, невідомі форми навчання).
- **F2 (Calculations)**: Точні межові оцінки (100, 90, 89, 82, 81, 74, 73, 64, 63, 60, 59, 35, 34, 0), дробні бали (89.9 -> 'B', 59.9 -> 'Fx'), від'ємні оцінки, оцінки понад 100, нечислові значення (NaN), поведінка за замовчуванням для undefined controlType.
- **F4 (UI Components)**: Рендеринг компонентів без передачі опціональних пропсів, рендеринг із порожніми дочірніми елементами (`children`), коректність прокидання посилань (`ref`), атрибути доступності `aria-*`.
- **F5 (SCSS Tokens)**: Стійкість токенів до екстремальних ширин екрана (0px, 9999px), наявність CSS-фолбеків, валідність синтаксису міксинів.
- **F6 (Backend Host)**: Відхилення незахищених протоколів (`http://`), перевірка адрес з нестандартними портами, нормалізація кінцевого слешу (`/`), обробка пробільних символів у змінних середовища.
- **F7 (Backend DTOs)**: Обробка порожніх відповідей з Moodle, наявність неочікуваних додаткових полів без порушення схеми, обробка некоректних міток часу (нульові чи від'ємні unix-timestamps).
- **F8 (UniHub Deps)**: Відсутність циклічних посилань між пакетами монорепозиторію, суворість специфікаторів `workspace:*`, валідність структури peerDependencies.
- **F9 (UniHub API)**: Поведінка `buildQueryString` за наявності порожніх рядків, null-значень та спецсимволів (URL-encoding), обробка помилок таймауту бекенду.
- **F10 (Tabs Navigation)**: Обробка невалідного параметра `?tab=unknown` (fallback на `overview`), стабільність активного табу під час оновлення сторінки, клавіатурна доступність перемикання (Tab/Enter).
- **F11 (Moodle Sider Indicator)**: Стан індикатора при згорнутому та розгорнутому сайдбарі, обробка тривалих затримок відповіді LMS (стан 'degraded' / 'offline').
- **F12 (Gradebook Boundaries)**: Відображення балу 0 (не плутати з null/порожньо), дисципліна з повною оцінкою без іспиту (100% за поточний контроль), екстремально довгі назви дисциплін.
- **F13 (URL Normalization)**: Регістронезалежність домену (`https://MOODLE.universemvp.tech`), уникнення подвійних слешів у шляхах (`//mod/assign`).

---

### Tier 3: Cross-Feature Integration Combinations

1. **Combination 1 (F1 + F2 + F7 + F12) — Full Grade Processing Pipeline**:
   Отримання сирих даних оцінок від Moodle API -> приведення до DTO `StudentRecordBookItem` -> обчислення ECTS літери та традиційної оцінки -> рендеринг у 3-стовпчиковій таблиці електронного деканату.
2. **Combination 2 (F1 + F4 + F10) — Overview Dashboard Composition**:
   Композиція головної картки студента: відображення профілю `StudentProfile` за допомогою компонентів `@universe/ui` (`Tag`, `ProgressBar`, `Button`) у табі «Картка студента / Огляд».
3. **Combination 3 (F6 + F11 + F13) — Unified LMS Host Consistency**:
   Наскрізна перевірка узгодженості адреси Moodle: клієнтський сервіс бекенду, посилання у футері сайдбару та модальне вікно завдання використовують єдиний канонічний хост `https://moodle.universemvp.tech`.
4. **Combination 4 (F1 + F7 + F9) — API Service Contracts Deserialization**:
   Клієнт `api.ts` надсилає запити на адаптовані бекенд-роути та гарантує точну десеріалізацію у спільні інтерфейси `AssignmentItem` та `CurriculumItem`.
5. **Combination 5 (F4 + F5 + F10) — UI Tokens & Adaptive Layout Integration**:
   Вкладки канонічного українського деканату стилізуються за допомогою SCSS-токенів `@universe/ui`, зберігаючи адаптивність при перемиканні точок зупинки (mobile / desktop).

---

### Tier 4: Real-World Scenarios (End-to-End User Journeys)

1. **Scenario 1: Complete Student Academic Record Review**:
   Студент входить у систему UniHub, перевіряє академічний рейтинг та GPA в огляді, переходить на «Заліковку та бали», аналізує підсумкові результати сесії за трьома шкалами (100-бальна, ECTS, традиційна) для іспитів та заліків.
2. **Scenario 2: Urgent Assignment Submission & Moodle Jump**:
   Студент бачить таймер найближчого дедлайну, відкриває «Завдання», фільтрує за терміном, переглядає опис завдання у модальному вікні та переходить за прямим захищеним посиланням на `https://moodle.universemvp.tech`.
3. **Scenario 3: Individual Curriculum & Weekly Schedule Navigation**:
   Студент перевіряє дисципліни індивідуального плану в табі «Індивідуальний план», порівнює зараховані кредити ECTS, після чого переглядає розклад лекцій/практик у табі «Розклад занять».
4. **Scenario 4: Differential Control Assessment (Exam vs Credit)**:
   Кінець семестру: диференційоване оцінювання результатів навчання — предмет з іспитом (73 бали -> 'D' / «задовільно»), предмет із заліком (65 балів -> 'E' / «зараховано») та академічна заборгованість (48 балів -> 'Fx' / «незадовільно» / «не зараховано»).
5. **Scenario 5: LMS Gateway Degradation & Fault-Tolerant Feedback**:
   Збій зв'язку зі шлюзом Moodle: API фіксує таймаут, футер інформує про стан мережі, а інтерфейс деканату відображає кешовані дані або компонент `Empty` без аварійного завершення роботи застосунку.
