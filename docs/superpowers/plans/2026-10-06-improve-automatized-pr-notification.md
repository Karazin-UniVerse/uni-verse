# RS-140: Improve Automatized PR Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реалізувати механізм щоденного нагадування про відкриті Pull Requests о 10:00 за Києвом із батчінгом за автором, компактним списком у Discord та окремою секцією для Dependabot, щоб запобігти зависанню рев'ю та шуму від поодиноких сповіщень.

**Architecture:** Окремий GitHub Actions workflow (`discord-pr-reminder.yml`) на базі `schedule` (cron щодня о 10:00 за Києвом у робочі дні: `0 7 * * 1-5`) та `workflow_dispatch`. Скрипт отримує всі відкриті non-draft PR через GitHub REST API, сегрегує PR людей та Dependabot, групує PR розробників за автором (`Map<Author, PR[]>`), формує єдиний структурований Discord Embed зі згадками авторів та призначених рев'юверів із `.github/discord-users.json`, окремим блоком для Dependabot, і надсилає його через Webhook.

**Tech Stack:** Node.js 22 (native `fetch`, `node:test`), GitHub Actions (`schedule`, `workflow_dispatch`), Discord Webhook API.

**Spec:** Notion Task RS-140 ("Improve automatized PR notification"):

- Batching per author
- Regular reminder once a day (10:00 Kyiv time, Mon-Fri)
- List (human PRs grouped per author, Dependabot PRs listed separately in a compact summary)

---

## Global Constraints

- Не порушувати існуючий функціонал `discord-pr-notify.yml` (миттєві події при відкритті/злитті PR) та `ci.yml` (сповіщення про збій CI).
- Використовувати нативні можливості Node.js 22 (вбудований `fetch`, `node:test`) без додавання сторонніх npm-залежностей у корінь репозиторії.
- Звернення до користувачів у Discord виключно через мапінг `.github/discord-users.json` з fallback на GitHub-профіль.
- Пропускати чернетки (draft PRs).
- PR від `dependabot[bot]` виділяти в окреме поле/секцію ембеда без пінгування команди в заголовку.
- Якщо відкритих PR немає взагалі — завершувати роботу тихо (`exit 0`), не засмічуючи Discord-канал порожніми повідомленнями.
- Дотримуватися лімітів Discord Webhook API (Embed description <= 4096 символів, Embed field value <= 1024 символів, загальний розмір <= 6000 символів).

## Review Focus

1. **Сегрегація Dependabot:** перевірити, що PR від Dependabot не змішуються з PR людей і не дублюються в авторських секціях.
2. **Ліміти довжини полів Discord при великій кількості PR одного автора:** якщо в автора багато PR, сумарний текст може перевищити 1024 символи поля Embed. Має працювати автоматичне розбиття на поля.
3. **Нульова кількість відкритих PR:** скрипт не повинен слати сповіщення "0 PR", якщо вся черга чиста.
4. **Обробка помилок GitHub API або Discord Webhook:** інформативне логування статусу.
5. **Часовий пояс cron-розкладу:** `0 7 * * 1-5` для 10:00 EEST (Kyiv time, UTC+3) у робочі дні.

---

## File Structure

```
.github/
├── workflows/
│   ├── discord-pr-notify.yml       # [EXISTING] миттєві сповіщення (opened, closed, etc.)
│   └── discord-pr-reminder.yml     # [NEW] щоденний cron-дайджест о 10:00
├── scripts/
│   ├── discord-pr-notify.mjs       # [MODIFY] додавання логіки нагадувань / дайджесту
│   └── tests/
│       └── discord-pr-notify.test.mjs # [NEW] тести для групування, Dependabot та форматування
└── discord-users.json              # [EXISTING] мапінг GitHub -> Discord ID
```

---

## Proposed Tasks

### Task 1: Чисті утиліти групування, обробки Dependabot та форматування

**Files:**

- Modify: `.github/scripts/discord-pr-notify.mjs`
- Create: `.github/scripts/tests/discord-pr-notify.test.mjs`

- [ ] **Step 1: Написати юніт-тести для сегрегації Dependabot, групування за автором та генерації ембеда**
- [ ] **Step 2: Запустити тести та переконатися у падінні** (`node --test .github/scripts/tests/discord-pr-notify.test.mjs`)
- [ ] **Step 3: Реалізувати утиліти `groupPullRequestsByAuthor`, `formatPrAge`, `buildReminderDiscordPayload`**
- [ ] **Step 4: Запустити тести та переконатися у проходженні**
- [ ] **Step 5: Зафіксувати результат**

### Task 2: Реалізація отримання PR з GitHub API та обробника `handlePrReminder`

**Files:**

- Modify: `.github/scripts/discord-pr-notify.mjs`

- [ ] **Step 1: Реалізувати функцію `fetchOpenPullRequests({ repo, token })`**
- [ ] **Step 2: Реалізувати функцію `handlePrReminder` із підтримкою DRY_RUN та тихим виходом при 0 PR**
- [ ] **Step 3: Оновити `main()` для обробки прапорця `--reminder` та змінної `NOTIFY_MODE=reminder`**
- [ ] **Step 4: Провести локальну верифікацію з моковими даними**

### Task 3: Створення GitHub Actions workflow `discord-pr-reminder.yml`

**Files:**

- Create: `.github/workflows/discord-pr-reminder.yml`

- [ ] **Step 1: Налаштувати розклад `cron: '0 7 * * 1-5'` (10:00 за Києвом) та `workflow_dispatch`**
- [ ] **Step 2: Перевірити валідність синтаксису YAML та права `contents: read`, `pull-requests: read`**

### Task 4: Фінальна верифікація та перевірка коду

- [ ] **Step 1: Запустити лінтери `pnpm lint` та `pnpm format:check`**
- [ ] **Step 2: Запустити юніт-тести скрипта `node --test .github/scripts/tests/discord-pr-notify.test.mjs`**
- [ ] **Step 3: Перевірити відсутність регресій у `discord-pr-notify.yml` та `ci.yml`**
