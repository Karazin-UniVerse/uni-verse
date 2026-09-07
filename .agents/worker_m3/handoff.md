# Звіт про виконання робіт: Узгодження бекенд-шлюзу Moodle (Milestone M3 — R4)

Виконав: Worker M3 (ролі: implementer, qa, specialist)  
Робоча директорія: `C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\worker_m3`  
Цільова гілка: `feature/unihub-moodle-shell`  
Отримувач: Teamwork Preview Orchestrator (ID: `407d3953-20c8-4d83-894b-c4886258532d`)  
Дата: 2026-09-07

---

## 1. Observation (Фактичні спостереження)

1. **Залежність `@universe/types` у `packages/backend`**:
   - Початковий стан: у `packages/backend/package.json` була відсутня залежність від пакета спільних контрактів `@universe/types`.
   - Зафіксовано: додано `"@universe/types": "workspace:*"` до блоку `dependencies`, після чого виконано синхронізацію робочого простору за допомогою `pnpm.cmd install`.

2. **Застаріла конфігурація хоста Moodle за замовчуванням**:
   - У вихідному коді бекенду виявлено жорстко закодований хост `https://moodle.karazin.ua`:
     - `packages/backend/src/moodle/moodle-client/moodle.client.service.ts` (рядок 24):
       `process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';`
     - `packages/backend/src/moodle/moodle-files/moodle-files.service.ts` (рядок 19):
       `const baseUrl = process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';`
     - `packages/backend/src/utils/get-creds.ts` (рядок 18):
       `process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua'`
     - Файли конфігурації оточення:
       - `packages/backend/.env` (рядок 5): `MOODLE_BASEURL="https://moodle.karazin.ua"`
       - `packages/backend/.env.example` (рядок 13): `MOODLE_BASEURL="https://moodle.karazin.ua"`
       - `.env.example` (рядок 13): `MOODLE_BASEURL="https://moodle.karazin.ua"`

3. **Невідповідність моделі оцінок у `packages/backend/src/moodle/moodle-grades`**:
   - У `moodle-grades-dto.ts` клас `MoodleGradeItemDto` містив лише базові рядкові поля `grade` та `rawGrade`, без обчислення 100-бального результату, шкали ECTS (A–F) та традиційної української оцінки («відмінно», «добре», «задовільно», «незадовільно», «зараховано», «не зараховано»).
   - У `moodle-grades.service.ts` мапінг не здійснював аналізу форми контролю курсу та розрахунку оцінок за шкалами вищої школи.

---

## 2. Logic Chain (Логічний ланцюг обґрунтування)

1. Оскільки вимога R4 та архітектура проєкту визначають перехід на інстанс `https://moodle.universemvp.tech`, усі дефолтні значення та конфігураційні змінні оточення повинні гарантувати звернення саме до цього домену за відсутності перевизначення через `MOODLE_BASEURL`.
2. На основі аналізу специфікації цифрової залікової книжки (`StudentRecordBookItem`), кінцеві клієнти та компоненти інтерфейсу потребують одночасного надання тришкальної системи оцінювання:
   - 100-бальний числовий результат (`totalScore` / `score`);
   - Літера ECTS (`ectsGrade`: `'A'`..`'F'`);
   - Традиційна оцінка (`traditionalGrade`: «відмінно», «добре», «задовільно», «незадовільно», «зараховано», «не зараховано»);
   - Форма підсумкового контролю (`controlType`: `'exam'`, `'credit'`, `'differentiated_credit'`);
   - Логічний прапорець успішності (`isPassed`).
3. Для забезпечення чистоти архітектури та уникнення дублювання логіки, розрахунок літери ECTS та національної оцінки делеговано канонічним утилітам із пакета `@universe/types`:
   - `calculateEctsGrade(score: number): EctsGrade`;
   - `calculateTraditionalGrade(score: number, controlType?: ControlType): TraditionalGrade`.
4. Для збереження зворотної сумісності зі старими клієнтами збережено всі попередні поля (`courseId`, `courseName`, `grade`, `rawGrade`, `year`, `semester`), а також реалізовано стійкий парсинг (`parseGradeScore`), що коректно обробляє дробові значення, числові та рядкові представлення балів, символи прочерку (`-`) та відсутні значення.
5. Для диференціації форми контролю реалізовано функцію `detectControlType`, яка на основі назви та короткого імені курсу автоматично виявляє заліки («залік», «credit») та диференційовані заліки («диф», «differentiated»), призначаючи форму контролю «exam» за замовчуванням.
6. Усі зміни оформлено з суворим дотриманням правил статичного аналізатора oxlint, зокрема вимог правила `universe(vertical-spacing)`.

---

## 3. Caveats (Застереження та припущення)

1. **Відсутність диференціації поточного та екзаменаційного балу в Overview Report**: стандартна функція Moodle `gradereport_overview_get_course_grades` повертає лише підсумковий бал за курс. Відповідно, поля `currentScore` та `examScore` встановлюються у `null` згідно з контрактом `StudentRecordBookItem`.
2. **Обмеження прав доступу в монорепозиторії**: Worker M3 має виключну зону відповідальності за `packages/backend/**` (та оновлення `.env.example`). Роботи над `packages/uni-hub` та іншими пакетами виконуються відповідними виконавцями (Worker M4).

---

## 4. Conclusion (Підсумковий висновок)

1. Завдання Milestone M3 (R4. Backend Moodle Gateway Alignment) виконано у повному обсязі без спрощень та без створення фіктивних заглушок.
2. Базовий URL у сервісах `MoodleClientService`, `MoodleFilesService` та хелпері `GetCreds` успішно переведено на `https://moodle.universemvp.tech`.
3. Файли `packages/backend/.env`, `packages/backend/.env.example` та `.env.example` оновлено до продуктивного хоста `https://moodle.universemvp.tech`.
4. Модуль `moodle-grades` повністю адаптовано під спільні контракти `@universe/types`: розраховуються бали за 100-бальною шкалою, оцінки ECTS та традиційні українські оцінки, а також статус зарахування.
5. Тестове покриття модуля `moodle-grades` розширено 9 новими контрольними тестами, які покривають усі граничні випадки (відмінно, добре, задовільно, незадовільно, заліки, прострочені та порожні бали).
6. Усі тести та перевірки типів у пакеті `@universe/backend` завершуються зі 100% успіхом (24 тестові набори, 74 тести, 0 помилок лінтера).

---

## 5. Verification Method (Метод незалежної верифікації)

Для незалежної верифікації виконаних змін запустити такі команди:

1. **Перевірка відсутності застарілого домену `moodle.karazin.ua` у бекенді**:

   ```powershell
   git grep -n "moodle.karazin.ua" packages/backend/
   ```

   _Очікуваний результат_: єдине входження залишається лише у `cors.config.spec.ts` для підтвердження валідації доменів Karazin у CORS. Усі інші файли використовують `moodle.universemvp.tech`.

2. **Перевірка типів TypeScript у пакеті бекенду**:

   ```powershell
   pnpm.cmd --filter @universe/backend run typecheck
   ```

   _Очікуваний результат_: код повернення 0, 0 помилок.

3. **Запуск повного набору юніт-тестів бекенду**:

   ```powershell
   pnpm.cmd --filter @universe/backend run test
   ```

   _Очікуваний результат_: 24 тестові набори, 74 тести виконано успішно.

4. **Перевірка якості коду за допомогою лінтера Oxlint**:
   ```powershell
   pnpm.cmd --filter @universe/backend run lint
   ```
   _Очікуваний результат_: `Found 0 warnings and 0 errors.`
