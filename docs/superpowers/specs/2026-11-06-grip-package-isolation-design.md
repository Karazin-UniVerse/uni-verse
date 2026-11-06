# Grip: окремий пакет, чинні deployments

Статус: локальна специфікація для погодження. Не комітити.

Замінює лише розміщення коду та спосіб розміщення frontend з попередньої
специфікації hosted Grip. Правила push, авторизації, квот і retention незмінні.

## Мета й погоджені обмеження

- Ізолювати Grip у `packages/grip`, не залишаючи його реалізації чи
  маршрутизації в `packages/uni-hub`.
- Не створювати нових deployments: frontend використовує `Dockerfile.frontend`,
  NestJS-модуль підключається до чинного backend.
- Зберегти `/dev-tools/grip`, поточний frontend origin та зовнішні backend URL.
- Видалення старого Grip-коду з UniHub є частиною перенесення; інші можливості
  UniHub не змінювати.
- Перед комітом, push або відповідями в PR показати diff і перевірки користувачу.
  Специфікації та плани залишити локальними.

## Один frontend-контейнер

`Dockerfile.frontend` збирає обидва Next.js-застосунки. У runtime:

- Nginx слухає зовнішній `PORT` контейнера.
- UniHub і Grip слухають різні внутрішні порти лише на loopback.
- Точний `/dev-tools/grip` і префікс `/dev-tools/grip/` обслуговує Grip.
  Решту шляхів, включно зі Storybook, обслуговує UniHub. Схожі префікси
  на кшталт `/dev-tools/gripper` не належать Grip.
- Grip має Next.js `basePath: '/dev-tools/grip'`: його assets, сторінки та BFF
  не конфліктують із UniHub. Проксі передає цей префікс без видалення.
- Статична конфігурація проксі та один entrypoint живуть поза UniHub.
  Не писати власний HTTP-проксі на Node.js.
- Entry point передає сигнали всім процесам і прибирає дочірні процеси.
  Неочікуваний вихід будь-якого сервісу завершує контейнер з помилкою,
  без прихованого нескінченного перезапуску одного процесу.
- Перевірка готовності доступна через проксі та перевіряє обидва застосунки;
  відкритого порту Nginx недостатньо для готовності.

Проксі має зберігати cookies, query, redirect та потокові відповіді Next.js,
мати узгоджені обмеження body і не створювати довіри до клієнтських forwarded
headers. Публічні origin для OAuth і перевірок залишаються явно налаштованими.
Це перенесення не вирішує відому проблему достовірної IP-атрибуції на backend.

## Межі пакета

- `packages/grip`: окремий Next.js frontend і BFF, локалізація Grip, UI дошки,
  API-клієнти, NestJS-модуль Grip, CLI/hook, cleanup runner і їхні тести.
- Frontend не імпортує server-модулі через спільний barrel. Залежності NestJS
  не потрапляють у браузерний bundle.
- Backend імпортує модуль з пакета. Пакет не імпортує `@universe/backend`.
  Підключення наявного Prisma provider та metadata для public endpoints має
  залишатися явним, без циклічних залежностей і копій auth-логіки.
- Prisma schema, migrations та згенерований client залишаються в поточному
  database workflow. Нової бази або зміни формату збережених даних немає.
- Una-примітиви й загальні SCSS-токени залишаються в `packages/ui`.
  GripBoard переноситься в Grip разом із поведінковими тестами.
  Grip-specific stories прибираються: правила репозиторію забороняють stories
  поза `packages/ui`; поведінкові перевірки зберігаються.
- Старі імпорти, exports і команди оновлюються; compatibility shims не додавати.
  Root-команди та Husky лишаються точками запуску, а не копіями реалізації.

### Відмінність від попередньої пропозиції

`CONSTRAINTS.md`, розділ 2, вимагає shared NestJS/Next.js contracts у
`packages/core/types`. Тому спільні Grip-контракти та необхідні для них спільні
значення залишаються в core за чинними правилами. Самостійно послаблювати
обмеження заради повного перенесення у Grip заборонено. Цю відмінність потрібно
погодити до реалізації; повне вилучення контрактів із core потребує окремого
явного дозволу на зміну відповідного архітектурного правила.

## Документація

Один основний `packages/grip/README.md`: setup, push flow, конфігурація,
контейнерний запуск, cleanup/retention та блокери production. Поточні Grip docs
консолідувати, посилання оновити. Не переносити локальні плани або screenshots
у committed documentation та не посилатися на відсутні repository assets.

## Критерії прийняття

- У UniHub немає Grip routes, translations, services, views чи залежності від
  `@universe/grip`. Зберігаються лише сторонні до Grip можливості застосунку.
- Один frontend image обслуговує UniHub, Storybook і Grip через один порт.
  Прямий перехід на дошку, assets, BFF і OAuth callback працюють за старими URL.
- Контейнер коректно обробляє startup, SIGTERM і аварійне завершення підпроцесу.
- Поведінкові тести не видалені й не пропущені. Зберігаються checks для exact
  push binding, fail-closed auth/config/quota, replay/fencing, cancellation,
  account/tab isolation, bounded input, retention і PostgreSQL concurrency.
- Перевірені lint, stylelint, typecheck, tests, build та Prettier змінених файлів;
  контейнерний smoke test охоплює маршрути, assets і завершення процесів.
- Production hosted activation залишається вимкненою. Live OAuth, повний
  hosted push/defense, audit, trusted IP, scheduler і restore evidence не
  вважаються перевіреними лише через успішне перенесення пакета.

## Наступний етап

Після погодження цієї специфікації підготувати локальний план реалізації.
Реструктуризацію починати після погодження плану та способу виконання.
