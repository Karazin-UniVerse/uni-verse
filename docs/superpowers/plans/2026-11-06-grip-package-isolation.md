# Grip package isolation — план реалізації

**Мета:** винести Grip з UniHub в окремий пакет без нових deployments.

**Архітектура:** два Next.js застосунки в одному frontend-контейнері за Nginx;
NestJS-модуль Grip працює в наявному backend. Shared API contracts залишаються
в core згідно з `CONSTRAINTS.md`.

**Технології:** pnpm workspaces, Next.js, NestJS, PostgreSQL/Prisma, Nginx.

**Специфікація:** `docs/superpowers/specs/2026-11-06-grip-package-isolation-design.md`.

## Обмеження

- Специфікація та цей план локальні, не комітити.
- Не створювати deployment чи базу; не вмикати hosted production.
- Зберегти зовнішні URL, push policy, OAuth, безпеку, retention і наявні тести.
- У `packages/uni-hub` не лишати Grip-коду; торкатися файлів лише для його видалення.
- Без коміту, push і відповідей у PR до окремого погодження diff.
- Не послаблювати `CONSTRAINTS.md`, не додавати compatibility shims.

## Критичні перевірки

1. `/dev-tools/gripper` не спрямовується до Grip, а `/dev-tools/grip` і його assets — спрямовуються.
2. Callback з query та `Set-Cookie` проходить через проксі без змін.
3. Недоступність будь-якого застосунку не маскується як готовність контейнера.
4. SIGTERM та аварійне завершення дочірнього процесу не залишають сиріт.
5. Зовнішній клієнт не може підробити довірену IP-адресу через forwarded headers.

## 1. Перенести NestJS-модуль

**Файли:** `packages/backend/grip/**` → `packages/grip/backend/**`;
`packages/backend/app.module.ts`, Prisma та auth integration, package manifests,
backend build/test configuration, `Dockerfile`.

- [ ] Зафіксувати поточні HTTP-тести guards, fail-closed і поведінки push;
      зберегти всі assertions та PostgreSQL concurrency suite.
- [ ] Визначити injection token для наявного `PrismaService`, який реєструє
      backend, та спільну canonical public metadata без імпорту backend з Grip.
      Перевірити guard integration на реальному Nest application; не дублювати
      `isPublic` і не створювати циклічну залежність пакетів.
- [ ] Перенести модуль і тести, оновити imports, збірку backend, workspace
      dependencies та Docker build; Prisma schema і migrations не змінювати.
- [ ] Запустити Grip backend unit/HTTP tests, backend typecheck/build і окремий
      PostgreSQL suite на disposable базі; перевірити fail-closed для 401/403/429,
      config, replay, fencing і cancellation.

## 2. Перенести frontend і CLI

**Файли:** `packages/uni-hub/app/dev-tools/grip/**`,
`packages/uni-hub/views/dev-tools/grip/**`, Grip-код у services та locales,
`packages/ui/components/complex/GripBoard/**`, `scripts/grip/**` →
`packages/grip/`; root `package.json`, Husky та тести викликів.

- [ ] Створити окремий Next.js app з `basePath: '/dev-tools/grip'` і власними
      перекладами; перенести BFF, UI, queries та всі пов'язані тести.
- [ ] Перенести CLI і cleanup runner, оновити root/Husky команди та imports.
      Зберегти shared contracts у core, Prisma у backend, Una primitives у UI.
- [ ] Видалити лише перенесені Grip файли, ключі й експорти з UniHub і UI;
      Storybook stories GripBoard прибрати відповідно до правил stories.
- [ ] Запустити перенесені frontend та CLI тести: auth, tab/account isolation,
      body limits, push binding, exclusions, fail-closed і cleanup; перевірити
      typecheck і production build обох frontend застосунків.
- [ ] Пошуком перевірити відсутність Grip routes, services, locales та imports
      у UniHub; старі URL і команди підтвердити тестами, не shim-ами.

## 3. Об'єднати frontend у контейнері

**Файли:** `Dockerfile.frontend`, нові конфігурація Nginx та entrypoint поза
UniHub; новий контейнерний smoke test у `tests/`.

- [ ] Спочатку додати smoke test routing: обидва точні Grip-шляхи та assets,
      `/dev-tools/gripper`, звичайна сторінка UniHub і `/storybook/`; перевірити
      query, cookies, redirects і відсутність довіри до підроблених IP headers.
- [ ] Зібрати обидва Next apps і Nginx в одному image; передавати `PORT`,
      слухати внутрішніми сервісами loopback, зберегти `/dev-tools/grip` префікс.
- [ ] Реалізувати готовність обох сервісів, передачу SIGTERM і завершення
      контейнера з помилкою при неочікуваному виході одного з них.
- [ ] Запустити контейнерний smoke test з перевіркою маршрутизації, callback,
      assets, readiness, SIGTERM та відмови кожного дочірнього процесу.

## 4. Документація і фінальні перевірки

**Файли:** `packages/grip/README.md`, `docs/grip.md`,
`docs/grip-hosted.md`, залежні посилання в README та deployment docs.

- [ ] Консолідувати Grip документацію в один README; зберегти setup,
      security/retention та production blockers; прибрати биті посилання.
- [ ] Запустити `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`, Grip CLI suite, PostgreSQL suite та container/browser smoke;
      перевірити Prettier змінених файлів і `git diff --check`.
- [ ] Оглянути diff, перевірити відсутність local plans/specs у staged files;
      показати результати й невирішені ризики користувачу до публікації.

## Спосіб виконання

Послідовно в поточній сесії; завдання залежать від спільних меж модуля та
контейнера. Після кожного етапу — цільові тести. Незалежне рев'ю лише за
окремим дозволом користувача; без автоматичного делегування.
