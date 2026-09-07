# Експертний звіт незалежного рецензування та стрес-тестування (Reviewer 2 / Adversarial Critic)

Харківський національний університет імені В. Н. Каразіна  
Навчально-науковий інститут комп’ютерних наук та штучного інтелекту  
Кафедра математичного моделювання та аналізу даних  
Проєкт: UniHub E-Dean's Office & Moodle Integration Layer  
Робоча гілка: `feature/unihub-moodle-shell`  
Виконавець: Reviewer 2 (ролі: reviewer, critic)  
Отримувач: Teamwork Preview Orchestrator (ID: `407d3953-20c8-4d83-894b-c4886258532d`)  
Дата: 2026-09-07T20:00:00Z

---

## Резюме рецензії (Review Summary)

**Вердикт**: **REQUEST_CHANGES**  
**Загальна оцінка надійності**: **HIGH**, проте приймальне тестування виявило **4 непройдені тести зі 110** у обов'язковому тестовому раннері Vitest (`tests/e2e/`), спричинені розбіжністю тестових очікувань у Tier 1 з реальною модульною архітектурою NestJS-шлюзу та форматуванням лапок у `.env.example`.

---

## 1. Observation (Фактичні спостереження)

### 1.1. Незалежний запуск збірки та статичного аналізу (Build & Static Analysis)

1. **Перевірка типів TypeScript (`pnpm.cmd run typecheck`)**:
   ```text
   • Running typecheck in 7 packages
   Tasks: 5 successful, 5 total (1 cached, 5 total)
   Time: 5.666s
   Result: 0 errors.
   ```
2. **Статичний аналізатор Oxlint (`pnpm.cmd run lint`)**:
   ```text
   Found 0 warnings and 0 errors.
   Finished in 867ms on 220 files with 140 rules using 12 threads.
   ```
3. **Продуктивна збірка Turborepo (`pnpm.cmd run build`)**:
   ```text
   Tasks: 5 successful, 5 total (1 cached, 5 total)
   Time: 12.032s
   Result: Code 0 across @universe/backend, @universe/types, @universe/ui, @universe/uni-hub.
   ```
4. **Юніт-тести бекенду (`pnpm.cmd --filter @universe/backend run test`)**:
   ```text
   Test Suites: 24 passed, 24 total
   Tests:       74 passed, 74 total
   Time:        7.023s
   Result: 100% PASS.
   ```

### 1.2. Незалежний запуск повного тестового комплексу E2E

Команда: `node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs`  
Результат: **106 пройшло (PASS), 4 не пройшло (FAIL)** зі 110 тестів (код повернення 1).

Текстові логи 4 помилок:

1. **Помилка 1 (F6-5: `f6-backend-moodle-host.test.ts:48`)**:

   ```text
   FAIL tests/e2e/tier1-feature-coverage/f6-backend-moodle-host.test.ts > F6-5: backend .env.example should configure MOODLE_BASEURL to https://moodle.universemvp.tech
   AssertionError: expected content to match /MOODLE_BASEURL\s*=\s*https:\/\/moodle\.universemvp\.tech/
   Received:
   MOODLE_BASEURL="https://moodle.universemvp.tech"
   ```

   _Спостереження_: у `packages/backend/.env.example` значення взято в подвійні лапки, тоді як регулярний вираз тесту очікував значення без лапок одразу після знака `=`.

2. **Помилка 2 (F7-2: `f7-backend-dtos.test.ts:18`)**:

   ```text
   FAIL tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts > F7-2: Backend moodle controller should expose /moodle/assignments endpoint
   AssertionError: expected 'import { Controller, Get, Query } fro…' to match /assignments/i
   ```

   _Спостереження_: тест шукає ендпоінт `/assignments` виключно у монолітному файлі `packages/backend/src/moodle/moodle.controller.ts`. Проте у реальній архітектурі NestJS ендпоінт `@Get('assignments')` розташований у виділеному контролері `packages/backend/src/moodle/moodle-assignments/moodle-assignments.controller.ts`, зареєстрованому в `MoodleModule`.

3. **Помилка 3 (F7-4: `f7-backend-dtos.test.ts:32`)**:

   ```text
   FAIL tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts > F7-4: Backend moodle controller should expose /moodle/events endpoint
   AssertionError: expected 'import { Controller, Get, Query } fro…' to match /events/i
   ```

   _Спостереження_: аналогічно, ендпоінт `@Get('events')` винесено до контролера `packages/backend/src/moodle/moodle-events/moodle-events.controller.ts`.

4. **Помилка 4 (F7-5: `f7-backend-dtos.test.ts:39`)**:
   ```text
   FAIL tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts > F7-5: Backend DTO structure should align with shared domain contracts
   AssertionError: expected false to be true
   Line 39: expect(fileExists(servicePath)).toBe(true);
   ```
   _Спостереження_: тест вимагає фізичної наявності файлу `packages/backend/src/moodle/moodle.service.ts`, який відсутній у кодовій базі, оскільки сервіси декомпоновано на `moodle-courses.service.ts`, `moodle-grades.service.ts`, `moodle-assignments.service.ts`, `moodle-events.service.ts`.

---

## 2. Logic Chain (Логічний ланцюг обґрунтування)

1. **Контроль цілісності (Integrity Check)**:
   - Проведено детальний аудит вихідного коду у пакетах `@universe/types`, `@universe/ui`, `@universe/backend` та `@universe/uni-hub`.
   - Жорстко закодованих відповідей, очікуваних результатів тестів чи фіктивних заглушок (facade implementations) не виявлено.
   - Алгоритми `calculateEctsGrade` та `calculateTraditionalGrade` реалізують чесні інтервальні умови.
   - Модулі бекенду реалізують валідні REST-запити до шлюзу Moodle з авторизацією через токен та обробкою таймаутів.
   - **Висновок за критерієм Integrity**: Порушень цілісності (INTEGRITY VIOLATION) **не виявлено**.

2. **Оцінка архітектурної відповідності та контрактів**:
   - `packages/types/src/index.ts`: експортує повні моделі `StudentProfile`, `CurriculumItem` / `Course`, `StudentRecordBookItem` / `GradeRecord`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus` та утиліти розрахунку балів.
   - `packages/ui/index.ts`: публічно експортує всі 11 компонентів (`Button`, `Modal`, `ProgressBar`, `Tag`, `Select`, `Input`, `Form`, `Spinner`, `Skeleton`, `Toast`, `Empty`), а `package.json` експортує `./vars.scss` та `./breakpoints.scss`.
   - `packages/uni-hub`: успішно підключив `@universe/types` та `@universe/ui` через специфікатор `workspace:*`.
   - `packages/backend`: успішно використовує утиліти `@universe/types` у сервісі `moodle-grades.service.ts`.

3. **Стрес-тестування граничних випадків (Adversarial Stress Testing)**:
   - _Граничні бали 0, 35, 60, 74, 82, 90, 100_: тести `tier2-boundary-corner-cases/boundary-grade-scales.test.ts` (6/6 PASS) та `boundary-unihub-gradebook.test.ts` (5/5 PASS) підтвердили коректність обчислень та відображення балу 0, дробних оцінок (89.9, 59.9), негативних і позамежних значень.
   - _Невідомі query-параметри `?tab`_: тест `boundary-unihub-navigation.test.ts` (5/5 PASS) та інспекція коду `DashboardPage.tsx` підтвердили наявність захисного предикату `isNavKey`, що забезпечує автоматичний фолбек на `overview` для невідомих значень (`?tab=unknown`, `?tab=events`).
   - _Згорнутий стан сайдбару (collapsed sidebar)_: у `DashboardPage.tsx` логотип перемикається на компактний `U`, посилання Moodle згортається до компактної іконки `🔗` зі збереженням зеленого індикатора активності та атрибута `title`, що гарантує доступність та відсутність переповнення розмітки.
   - _Обробка збоїв LMS (fallback handling)_: у разі недоступності бекенду `DashboardPage` перехоплює помилку, показує повідомлення через Toast та безпечно відображає автентичні навчальні дані ХНУ ім. В. Н. Каразіна замість аварійного падіння (white screen).

4. **Обґрунтування вердикту REQUEST_CHANGES**:
   - Відповідно до вимог технічного регламенту, перед фінальним комітом у гілку `feature/unihub-moodle-shell` команда `node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs` має завершуватися зі 100% успіхом (exit code 0).
   - Наразі 4 тести падають через невідповідність очікувань тесту конфігурації `.env.example` та сольній структурі контролерів бекенду.
   - Зміни потребують виправлення для досягнення бездоганного результату 110/110 PASS.

---

## 3. Findings (Детальний перелік зауважень)

### [Major] Finding 1: Невідповідність регулярного виразу в тесті F6-5 наявності лапок у `.env.example`

- **Що**: Тест `tests/e2e/tier1-feature-coverage/f6-backend-moodle-host.test.ts` падає через те, що у `packages/backend/.env.example` рядок 13 містить `MOODLE_BASEURL="https://moodle.universemvp.tech"`.
- **Де**: `packages/backend/.env.example:13` та `tests/e2e/tier1-feature-coverage/f6-backend-moodle-host.test.ts:48`.
- **Чому**: Регулярний вираз `/MOODLE_BASEURL\s*=\s*https:\/\/moodle\.universemvp\.tech/` не враховує подвійні лапки.
- **Рекомендація**: У файлі `packages/backend/.env.example` прибрати подвійні лапки (`MOODLE_BASEURL=https://moodle.universemvp.tech`) або оновити регулярний вираз у тесті для підтримки опціональних лапок `/?MOODLE_BASEURL\s*=\s*"?https:\/\/moodle\.universemvp\.tech"?/`.

### [Major] Finding 2: Крихкість специфікаційних тестів F7-2 та F7-4 (монолітний контролер vs модульні контролери NestJS)

- **Що**: Тести очікують ендпоінти `/assignments` та `/events` безпосередньо всередині файлу `packages/backend/src/moodle/moodle.controller.ts`.
- **Де**: `tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts:18, 32`.
- **Чому**: Архітектура бекенду модульна: ендпоінти винесені у `moodle-assignments.controller.ts` та `moodle-events.controller.ts`. Вони повноцінно працюють та покриті юніт-тестами (24/24 passed), але специфікаційний тест читає лише один файл.
- **Рекомендація**: Оновити `tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts`, щоб він інспектував відповідні контролери (`moodle-assignments.controller.ts` та `moodle-events.controller.ts`) або перевіряв реєстрацію контролерів у `moodle.module.ts`.

### [Major] Finding 3: Перевірка існування неіснуючого файлу в F7-5

- **Що**: Тест перевіряє `expect(fileExists('packages/backend/src/moodle/moodle.service.ts')).toBe(true)`.
- **Де**: `tests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts:39`.
- **Чому**: Такого файлу ніколи не існувало в репозиторії, сервіси декомпоновані (`moodle-courses.service.ts`, `moodle-grades.service.ts` тощо).
- **Рекомендація**: Оновити шлях у тесті на реальний сервіс, наприклад, `packages/backend/src/moodle/moodle-grades/moodle-grades.service.ts`, або створити реекспортний фасад.

### [Minor] Finding 4: Розбіжність документації у таблиці TEST_READY.md

- **Що**: У розділі 3 `TEST_READY.md` рядок F7 позначений як `PASS (5/5)`, тоді як у розділі 4 вказано наявність 24 непройдених тестів, серед яких 3 тести належали саме до F7.
- **Де**: `TEST_READY.md:72`.
- **Чому**: Аспіраційна оцінка автора тестового плану перед завершенням майлстоунів M1-M4.
- **Рекомендація**: Синхронізувати таблицю готовності після виправлення тестів F7.

---

## 4. Caveats (Застереження)

1. Рецензування проводилося строго в режимі **Review-only** без самостійного внесення правок у робочий код реалізації.
2. Робота клієнта з живим сервером Moodle перевірялася за допомогою автономного тестового шлюзу та мокових фікстур через відсутність прямого підключення до продакшн-БД під час офлайн-прогону.

---

## 5. Conclusion (Підсумковий висновок)

1. Загальна якість реалізації коду у всіх чотирьох пакетах (`@universe/types`, `@universe/ui`, `@universe/backend`, `@universe/uni-hub`) знаходиться на **дуже високому рівні**:
   - `typecheck` проходить з 0 помилок у всіх 7 пакетах;
   - `oxlint` проходить з 0 помилок і 0 попереджень;
   - `turbo build` успішно збирає всі пакети;
   - Всі 24 набори юніт-тестів бекенду проходять успішно (74/74);
   - 106 зі 110 E2E-тестів проходять успішно, включаючи всі складні інтеграційні та граничні сценарії (Tier 2, Tier 3, Tier 4).
2. Для завершення майлстоуну M_FINAL та отримання фінального схвалення (APPROVE) необхідно усунути 4 виявлені помилки у тестах Tier 1 (F6-5, F7-2, F7-4, F7-5).

---

## 6. Verification Method (Метод незалежної верифікації)

Після внесення зазначених коригувань виконати перевірку:

```powershell
# 1. Запуск E2E тестів
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs

# Очікуваний результат:
# Test Files  21 passed (21)
# Tests       110 passed (110)

# 2. Перевірка статичного аналізу та збірки
pnpm.cmd run typecheck
pnpm.cmd run lint
pnpm.cmd run build
```
