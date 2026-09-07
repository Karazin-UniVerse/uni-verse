# TEST READY: Opaque-Box E2E Test Suite

Тестовий комплекс Opaque-Box E2E успішно розгорнуто, верифіковано та готовий до супроводу розробки й приймального тестування (Acceptance Testing) у репозиторії `uni-verse`.

---

## 1. Команди запуску тестового комплексу (Runner Commands)

```bash
# Швидкий запуск через Node.js (рекомендовано)
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs

# Запуск через pnpm.cmd у робочому просторі
pnpm.cmd --filter @universe/ui exec vitest run --config ../../tests/e2e/vitest.config.mjs

# Запуск окремих рівнів тестування (Tiers)
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier1-feature-coverage/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier2-boundary-corner-cases/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier3-cross-feature-combinations/
node packages/ui/node_modules/vitest/vitest.mjs run --config tests/e2e/vitest.config.mjs tests/e2e/tier4-real-world-scenarios/
```

---

## 2. Структура тестового комплексу (Test Suite Overview)

Загальний обсяг: **110 тестів** у **21 тестовому файлі**, розподілених за 4 рівнями:

```
tests/e2e/
├── vitest.config.mjs                       # Конфігурація тестового середовища
├── test-helpers.ts                         # Оракули, мок-фікстури та хелпери
├── tier1-feature-coverage/                 # Рівень 1: Базове покриття фіч (64 тести)
│   ├── f1-domain-models.test.ts            # F1: Спільні моделі @universe/types (6 тестів)
│   ├── f2-grade-calculations.test.ts      # F2: Шкали оцінювання ECTS та традиційна (6 тестів)
│   ├── f4-ui-components.test.ts            # F4: 11 компонентів Una UI в index.ts (6 тестів)
│   ├── f5-ui-scss-tokens.test.ts           # F5: SCSS токени vars & breakpoints (5 тестів)
│   ├── f6-backend-moodle-host.test.ts      # F6: Хост https://moodle.universemvp.tech (5 тестів)
│   ├── f7-backend-dtos.test.ts             # F7: DTO узгодження бекенду (5 тестів)
│   ├── f8-unihub-dependencies.test.ts      # F8: Залежності UniHub package.json (5 тестів)
│   ├── f9-unihub-api-service.test.ts       # F9: Інтеграція api.ts (5 тестів)
│   ├── f10-unihub-ukrainian-tabs.test.ts   # F10: 5 канонічних українських вкладок (6 тестів)
│   ├── f11-unihub-sider-moodle.test.ts     # F11: Посилання на Moodle у футері сайдбару (5 тестів)
│   ├── f12-unihub-gradebook.test.ts        # F12: 3-рівнева заліковка (100, ECTS, традиційна) (5 тестів)
│   └── f13-unihub-legacy-urls.test.ts      # F13: Очищення застарілих посилань karazin.ua (5 тестів)
├── tier2-boundary-corner-cases/            # Рівень 2: Граничні та стрес-випадки (36 тестів)
│   ├── boundary-grade-scales.test.ts       # F2: Межі балів (0, 34/35, 59/60, 73/74, 81/82, 89/90, 100)
│   ├── boundary-domain-models.test.ts      # F1: Порожні та null поля, академічні відпустки
│   ├── boundary-backend-host.test.ts       # F6: Заборона http://, валідація портів і слешів
│   ├── boundary-backend-dtos.test.ts       # F7: Порожні відповіді, зайві поля, парсинг рядкових балів
│   ├── boundary-ui-components.test.ts      # F4/F5: Клампінг прогрес-бару, тони тегів, брейкпоінти
│   ├── boundary-unihub-navigation.test.ts  # F10/F11: Невідомі query-параметри ?tab, клавіатурний фокус
│   └── boundary-unihub-gradebook.test.ts   # F12/F13: Відображення балу 0, відсутність іспиту, безпека URL
├── tier3-cross-feature-combinations/       # Рівень 3: Міжмодульна інтеграція (5 тестів)
│   └── cross-feature-integration.test.ts   # Комбінації C1 (F1+F2+F7+F12), C2, C3, C4, C5
└── tier4-real-world-scenarios/             # Рівень 4: Реальні користувацькі сценарії (5 тестів)
    └── real-world-scenarios.test.ts        # Сценарії S1 (Сесія), S2 (Дедлайн), S3 (План), S4 (Дифзалік), S5 (Збій LMS)
```

---

## 3. Чекліст критеріїв готовності (Acceptance Criteria Checklist)

| Фіча / Вимога                          | Специфікація                                                                                                                                 | Статус тестів  | Цільовий майлстоун |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ |
| **F1: Shared Core Domain Models**      | `StudentProfile`, `CurriculumItem`, `StudentRecordBookItem`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus` у `packages/types`      | **PASS (6/6)** | M1                 |
| **F2: Grade & Scale Calculations**     | `calculateEctsGrade` (A–F) та `calculateTraditionalGrade` (відмінно/добре/задовільно/зараховано)                                             | **PASS (6/6)** | M1                 |
| **F3: Types Package Exports**          | Експорти в `packages/types/package.json` та конфігурація `tsconfig.json`                                                                     | **PASS**       | M1                 |
| **F4: UI 11 Component Public Exports** | Експорт `Button`, `Modal`, `ProgressBar`, `Tag`, `Select`, `Input`, `Form`, `Spinner`, `Skeleton`, `Toast`, `Empty` у `packages/ui/index.ts` | **PASS (6/6)** | M2                 |
| **F5: SCSS Tokens Public Exports**     | Експорт `./vars.scss` та `./breakpoints.scss` у `packages/ui/package.json`                                                                   | **PASS (5/5)** | M2                 |
| **F6: Backend Moodle Host Alignment**  | За замовчуванням `https://moodle.universemvp.tech` у `MoodleClientService`, файлах та env                                                    | **PASS (5/5)** | M3                 |
| **F7: Backend DTOs Alignment**         | Відповідність ендпоінтів `/moodle/*` контрактам спільних типів                                                                               | **PASS (5/5)** | M3                 |
| **F8: UniHub Dependencies Alignment**  | Додано `@universe/types` та `@universe/ui` у залежності `packages/uni-hub`                                                                   | **PASS (5/5)** | M4                 |
| **F9: UniHub API Service Alignment**   | `packages/uni-hub/src/services/api.ts` з типізованими методами                                                                               | **PASS (5/5)** | M4                 |
| **F10: 5 Canonical Ukrainian Tabs**    | «Картка студента / Огляд», «Індивідуальний план», «Заліковка та бали», «Розклад занять», «Завдання»                                          | **PASS (6/6)** | M4                 |
| **F11: Sidebar Footer Moodle Link**    | Посилання `🔗 moodle.universemvp.tech` із зеленим індикатором активності у `siderFooter`                                                     | **PASS (5/5)** | M4                 |
| **F12: 3-Tier Gradebook Display**      | 100-бальна оцінка + ECTS літера (A–F) + традиційна оцінка («відмінно», «добре»...)                                                           | **PASS (5/5)** | M4                 |
| **F13: Fix Legacy URLs in UniHub**     | Заміна застарілого `moodle.karazin.ua` на `moodle.universemvp.tech` в `AssignmentModal`                                                      | **PASS (5/5)** | M4                 |

---

## 4. Результати виконання тестового комплексу (Execution Results)

- **Загальна кількість тестів**: 110
- **Пройдено успішно (PASS)**: 110 (100%)
- **Не пройдено (FAIL)**: 0 (код повернення 0)
- **Тестові файли**: 21 passed (21 total)
- **Час виконання**: ~0.95 с
- **Статичний аналіз коду (Linter / Oxlint)**: 0 помилок, 0 попереджень (`Found 0 warnings and 0 errors`)
- **Форматування коду (Prettier)**: 100% відповідність (`All matched files use Prettier code style!`)
- **Статус готовності**: 100% READY (Acceptance Criteria 100% Met)
