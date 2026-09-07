# Звіт про передачу результатів (Handoff Report): E2E Testing Track

Харківський національний університет імені В.Н. Каразіна  
Навчально-науковий інститут комп’ютерних наук та штучного інтелекту  
Кафедра математичного моделювання та аналізу даних  
Проєкт: UniHub E-Dean's Office & Moodle Integration Layer  
Трек: Opaque-Box E2E Test Suite Creation  
Дата: 2026-09-07

---

## 1. Observation (Спостереження)

1.1. **Вихідний стан репозиторію**:

- У ході аналізу встановлено, що монорепозиторій `uni-verse` базується на `pnpm` (v10.0.0) та `turbo` (v2.10.12).
- За допомогою аналізу `packages/types/package.json` та виклику перевірки файлової системи зафіксовано, що директорія `packages/types/src/index.ts` була відсутня (`Test-Path` повернув `False`), а скрипти збірки пакету були плейсхолдерами (`"typecheck": "echo 'No typecheck yet'"`).
- У файлі `packages/ui/index.ts` були присутні лише закоментовані експорти та `export {};`. Компоненти дизайн-системи знаходились у піддиректоріях `packages/ui/components/una/`.
- У файлі `packages/backend/src/moodle/moodle-client/moodle.client.service.ts` (рядок 24) за замовчуванням використовувався застарілий домен: `process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua'`.
- У файлі `packages/uni-hub/src/views/DashboardPage.tsx` (рядки 353–360) масив `menuItems` містив 6 застарілих російськомовних вкладок (`['Обзор', 'Курсы', 'Оценки', 'Задания', 'Расписание', 'События']`), а футер сайдбару `siderFooter` не містив посилання `🔗 moodle.universemvp.tech` із зеленим індикатором активності.
- У файлі `packages/uni-hub/src/components/AssignmentModal.tsx` (рядок 181) містилось пряме посилання на `https://moodle.karazin.ua/mod/assign/view.php?a=${module.instance}`.

1.2. **Тестове середовище та інструментарій**:

- У робочому просторі встановлено `node` версії `v24.18.1` та `vitest` версії `v5.0.0` (у пакеті `@universe/ui`).
- Для запуску тестів було сконфігуровано файл `tests/e2e/vitest.config.mjs` із кореневим шляхом до всього монорепозиторію.
- Виконання команди `node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs` продемонструвало успішний запуск раннера без збоїв середовища:
  ```text
  Test Files  10 failed | 11 passed (21)
  Tests       24 failed | 86 passed (110)
  Start at    22:44:59
  Duration    1.14s
  ```
- Статичний аналіз коду за допомогою `pnpm.cmd run lint` (`oxlint --deny-warnings`) повернув:
  ```text
  Found 0 warnings and 0 errors.
  Finished in 763ms on 220 files with 140 rules using 12 threads.
  ```
- Перевірка форматування через `pnpm.cmd exec prettier --check tests/e2e` підтвердила повну відповідність стилю: `All matched files use Prettier code style!`.

---

## 2. Logic Chain (Логічний ланцюг)

2.1. Відповідно до вимог `ORIGINAL_REQUEST.md` та `PROJECT.md`, тестувальник Opaque-Box розробляє незалежні специфікаційні тести для перевірки контрактів між пакетами перед та під час розробки відповідних майлстоунів (M1–M4).  
2.2. На основі специфікації у `PROJECT.md` § Interface Contracts було створено математичні оракули розрахунку шкал оцінювання (`oracleCalculateEctsGrade` та `oracleCalculateTraditionalGrade`) у `tests/e2e/test-helpers.ts`. Це забезпечує точне еталонне джерело очікуваних значень без ризику фасадного тестування.  
2.3. Для реалізації 4-рівневої піраміди тестування:

- **Tier 1 (Feature Coverage)**: Створено 12 тестових файлів (64 тести), які окремо покривають фічі F1, F2, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13 (від 5 до 6 тестів на кожну фічу).
- **Tier 2 (Boundary & Corner Cases)**: Створено 7 тестових файлів (36 тестів), які охоплюють точні порогові значення балів (0, 34/35, 59/60, 73/74, 81/82, 89/90, 100), суб-бальні десяткові значення (89.9, 59.9), негативні та позамежні бали, відсутність іспиту (null examScore), клампінг прогрес-барів, заборону протоколу http://, відхилення невалідних назв вкладок тощо.
- **Tier 3 (Cross-Feature Combinations)**: Створено тестовий файл із 5 комплексними міжмодульними сценаріями інтеграції контрактів (Grade Processing Pipeline, Overview Composition, Host Consistency, API Deserialization, UI Tokens).
- **Tier 4 (Real-World Scenarios)**: Створено 5 наскрізних сценаріїв типових користувацьких сесій студента (Сесія та заліковка, Термінова здача дедлайну, Індивідуальний план та розклад, Диференційоване оцінювання, Відмовостійкість шлюзу).  
  2.4. Результат запуску (86 пройдено, 24 очікують імплементації) суворо відповідає поточній стадії життєвого циклу проєкту: непройдені тести чітко ізолюють нереалізовані вимоги майлстоунів M1, M2, M3 та M4 (відсутність файлу `types/src/index.ts`, відсутність експортів в `ui/index.ts`, залишки домену `moodle.karazin.ua`, відсутність українських вкладок та 3-рівневої таблиці).  
  2.5. Усі створені тестові файли відповідають стандартам репозиторію: 0 помилок у статичному аналізаторі `oxlint` та 100% форматування `prettier`.

---

## 3. Caveats (Застереження)

3.1. Тести для F1 та F2 використовують динамічний імпорт `loadTypesModule()` із перевіркою існування файлу `packages/types/src/index.ts`. Допоки агент майлстоуну M1 не створить зазначений файл та не експортує моделі й функції, відповідні тести очікувано сигналізують про незавершеність імплементації.  
3.2. Тести не вносять змін до вихідного коду застосунків монорепозиторію відповідно до обмежень ролі Test Writer (спеціалізоване тестування без зміни коду реалізації).

---

## 4. Conclusion (Висновки)

4.1. **Завдання виконано у повному обсязі**:

- Створено документацію архітектури тестування `TEST_INFRA.md` у корені проєкту.
- Розгорнуто автономний тестовий комплекс Opaque-Box E2E у директорії `tests/e2e/` (110 тестів у 21 файлі за 4 рівнями).
- Забезпечено виконання тестів за допомогою `node` та `pnpm.cmd` з часом прогону 1.14 с.
- Код тестового комплексу пройшов перевірку лінтером `oxlint` (0 warnings, 0 errors) та форматуванням `prettier`.
- Створено фінальний документ готовності `TEST_READY.md` у корені проєкту.

---

## 5. Verification Method (Метод незалежної верифікації)

Для незалежної перевірки функціонування тестової інфраструктури виконати наступні команди у корені робочого простору `C:\Users\TipTop230\WebstormProjects\uni-verse`:

1. **Запуск повного комплексу E2E-тестів**:

   ```bash
   node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs
   ```

   _Критерій валідності_: успішне виконання 110 тестів (86 pass / 24 fail до завершення M1-M4, 110 pass після завершення).

2. **Запуск через pnpm.cmd**:

   ```bash
   pnpm.cmd --filter @universe/ui exec vitest run --config ../../tests/e2e/vitest.config.mjs
   ```

3. **Перевірка лінтером (Oxlint)**:

   ```bash
   pnpm.cmd run lint
   ```

   _Критерій валідності_: виведення `Found 0 warnings and 0 errors`.

4. **Перевірка форматування (Prettier)**:

   ```bash
   pnpm.cmd exec prettier --check tests/e2e
   ```

   _Критерій валідності_: виведення `All matched files use Prettier code style!`.

5. **Інспекція артефактів**:
   - `C:\Users\TipTop230\WebstormProjects\uni-verse\TEST_INFRA.md`
   - `C:\Users\TipTop230\WebstormProjects\uni-verse\TEST_READY.md`
   - `C:\Users\TipTop230\WebstormProjects\uni-verse\tests\e2e\`
