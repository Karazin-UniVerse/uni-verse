# Forensic Integrity Audit Report (Звіт судового аудиту цілісності)

**Work Product**: Репозиторій Karazin-UniVerse/uni-verse (гілка eature/unihub-moodle-shell)  
**Profile**: General Project  
**Integrity Mode**: Development (відповідно до ORIGINAL_REQUEST.md)  
**Verdict**: **CLEAN**

---

## 1. Observation (Безпосередні емпіричні спостереження)

### 1.1. Аналіз вихідного коду та перевірка заборонених патернів

- **Hardcoded test expectations**:
  У ході перевірки за допомогою команди git grep "process.env.NODE_ENV" packages/ зафіксовано єдине входження у packages/backend/src/auth/auth.controller.ts:60 (secure: process.env.NODE_ENV === 'production'), що відповідає стандарту налаштування HTTP-only cookies у продакшні. Жодних умовних обходів тестів виду if (NODE_ENV === 'test') або повернення фіктивних даних за назвою тесту виявлено не було.
- **Facade implementations**:
  У модулі packages/types/src/index.ts функції calculateEctsGrade (рядки 202–228) та calculateTraditionalGrade (рядки 241–262) реалізують детерміновану математичну логіку трансляції 100-бальної шкали в оцінки ECTS (A–F) та національну шкалу («відмінно», «добре», «задовільно», «незадовільно», «зараховано», «не зараховано»). У модулі packages/backend/src/moodle/moodle-grades/moodle-grades.service.ts функції parseGradeScore (рядки 25–61) та detectControlType (рядки 63–83) здійснюють реальний числовий парсинг рядкових та числових оцінок з валідацією isFinite, округленням до 2 знаків після коми та клампінгом у діапазоні [0, 100], а також визначення форми контролю (іспит, залік, дифзалік).
- **Pre-populated artifacts**:
  У репозиторії відсутні сторонні бінарні логи тестування, фальсифіковані звіти або попередньо збережені результати збірки.

### 1.2. Доменні контракти (@universe/types)

- Файл packages/types/src/index.ts: містить вичерпні інтерфейси StudentProfile, CurriculumItem, StudentRecordBookItem, GradeRecord, AssignmentItem, ScheduleItem, LmsConnectionStatus, типи шкали ECTS та традиційної оцінки, а також розрахункові утиліти.
- Файл packages/types/package.json: налаштовано експорти main, ypes та exports на ./src/index.ts.
- Тестування: виконання команди pnpm.cmd --filter @universe/types test завершилося з кодом 0 (20 з 20 тестів пройдено успішно за 164 мс).

### 1.3. Публічні компоненти дизайн-системи (@universe/ui)

- Файл packages/ui/index.ts: експортує повний перелік 11 обов'язкових компонентів Una UI (Button, Modal, ProgressBar, Tag, Select, Input, Form, Spinner, Skeleton, Toast, Empty).
- Файл packages/ui/package.json: експортує токени ./vars.scss та ./breakpoints.scss.
- Файл packages/ui/vars.scss: експортує SCSS-змінні відступів $space-* паралельно з CSS Custom Properties.

### 1.4. Інтеграційний шар Moodle у бекенді (@universe/backend)

- Сервіс packages/backend/src/moodle/moodle-client/moodle.client.service.ts: базовий URL за замовчуванням встановлено у https://moodle.universemvp.tech (рядок 24). Реалізовано сувору перевірку протоколу https:// (рядки 29–31).
- Модулі moodle-files.service.ts (рядок 19), get-creds.ts (рядок 18) та конфігураційний файл .env.example використовують https://moodle.universemvp.tech.
- Модуль packages/backend/src/moodle/moodle-grades/moodle-grades.service.ts: поєднує Moodle API з @universe/types.
- Бекенд-тести: виконання команди pnpm.cmd --filter @universe/backend test продемонструвало успішне проходження 24 тестових наборів (74 з 74 тестів) без помилок.

### 1.5. Інтерфейс деканату в UniHub (@universe/uni-hub)

- Файл packages/uni-hub/src/views/DashboardPage.tsx:
  - 5 канонічних вкладок: «Картка студента / Огляд» (overview), «Індивідуальний план» (courses), «Заліковка та бали» (grades), «Розклад занять» (schedule), «Завдання» (ssignments).
  - Футер бічної панелі: містить статус-посилання 🔗 moodle.universemvp.tech з класом styles.moodleStatusLink та активним анімованим індикатором styles.statusDot.
  - Електронна заліковка: відображає 8 колонок із 100-бальним балом, шкалою ECTS (A–F) та національною оцінкою («відмінно», «добре», «задовільно», «зараховано»).
- Файл packages/uni-hub/src/components/AssignmentModal.tsx: застарілий домен moodle.karazin.ua замінено на moodle.universemvp.tech.

### 1.6. Верифікаційні перевірки монорепозиторію

- **Linter (oxlint)**: pnpm.cmd run lint — 0 помилок, 0 попереджень на 220 файлах.
- **Typecheck (tsc)**: pnpm.cmd run typecheck та прямий запуск sc --noEmit у пакетах ypes, ui, ackend, uni-hub — 0 помилок типізації.
- **Build (turbo build)**: pnpm.cmd run build та pnpm.cmd --filter @universe/uni-hub build — успішна компіляція Next.js та створення всіх маршрутів (/, /_not-found, /courses/[courseId]/contents, /login).

---

## 2. Logic Chain (Логічний ланцюг обґрунтування)

1. **Відповідність контрактам і автентичність**:
   Аналіз коду підтвердив, що всі ключові сутності та функції мають повноцінну внутрішню реалізацію. Зокрема, функції розрахунку оцінок та парсингу балів містять повну бізнес-логіку з обробкою граничних значень, що спростовує гіпотезу про наявність фасадних (dummy) заглушок.
2. **Відсутність маніпуляцій тестовими очікуваннями**:
   Емпірична перевірка тестів та вихідного коду показала відсутність підлаштування під конкретні імена або маніпуляцій з оточенням. Усі модульні та інтеграційні тести оперують чистими математичними та контрактними перевірками.
3. **Невідповідності у 4 сторонніх E2E-тестах**:
   Під час виконання повного набору e2e-тестів ( ests/e2e/, 110 тестів) було зафіксовано 106 успішних та 4 неуспішних тести. Детальний аналіз показав:
   - У тесті 6-backend-moodle-host.test.ts регулярний вираз очікував рядок без лапок, тоді як у .env.example значення було записане в лапках: MOODLE_BASEURL="https://moodle.universemvp.tech".
   - У тестах 7-backend-dtos.test.ts (F7-2, F7-4, F7-5) автор тестів зробив некоректне припущення про існування єдиного файлу moodle.controller.ts та монолітного moodle.service.ts, тоді як у реальній архітектурі NestJS ендпоінти винесені у спеціалізовані контролери (moodle-assignments.controller.ts, moodle-events.controller.ts).
     Таким чином, це є обмеженням тестових оракулів E2E-тестсьюту, а не порушенням цілісності самої кодової бази.
4. **Виконання критеріїв приймання**:
   Усі 8 пунктів приймальних критеріїв з ORIGINAL_REQUEST.md виконані в повному обсязі, система збирається без жодної помилки.

---

## 3. Caveats (Застереження та припущення)

- **Зовнішній LMS сервер**: Аудит проводився без підключення до реального зовнішнього інстансу Moodle за адресою https://moodle.universemvp.tech (через відсутність активних мережевих секретів у статичному оточенні), перевірка здійснювалася на рівні конфігураційного шару, контролерів, клієнтських сервісів та мок-тестів.
- **E2E тест-сьют**: Окремі селектори в ests/e2e/tier1-feature-coverage/f7-backend-dtos.test.ts орієнтовані на монолітний контролер; рекомендовано оновити шляхи тестів для зіставлення з модульною структурою контролерів packages/backend/src/moodle/.

---

## 4. Conclusion (Підсумковий вердикт)

- **Вердикт**: **CLEAN** (Чисто, порушень цілісності не виявлено).
- Проєкт повністю відповідає вимогам ORIGINAL_REQUEST.md та PROJECT.md.
- Усі компоненти деканату UniHub, спільні типи @universe/types, дизайн-система @universe/ui та бекенд-адаптер Moodle реалізовані автентично, без фасадних заглушок чи підроблених результатів.

---

## 5. Verification Method (Метод незалежної верифікації)

Для незалежного відтворення результатів аудиту виконати наступні команди:

1. Перевірка лінтером:
   `ash
pnpm.cmd run lint
`
   _Критерій успіху_: 0 warnings, 0 errors.
2. Перевірка типізації:
   `ash
pnpm.cmd run typecheck
`
   _Критерій успіху_: 5/5 tasks successful.
3. Повна збірка проєкту:
   `ash
pnpm.cmd run build
`
   _Критерій успіху_: Успішна збірка всіх пакетів та Next.js додатку.
4. Модульні тести пакетів:
   `ash
pnpm.cmd --filter @universe/types test
pnpm.cmd --filter @universe/backend test
`
   _Критерій успіху_: 20/20 тестів types та 24/24 сьютів backend пройдено.
