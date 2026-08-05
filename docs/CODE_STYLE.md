Код-стайл и подходы (коротко):

1) Общие
- TypeScript строго: избегать any/implicit types
- Именования: camelCase для переменных/функций, PascalCase для компонентов/классов, UPPER_SNAKE_CASE для констант
- Коммиты: Conventional Commits (feat:, fix:, chore:, etc.)
- Ветки: feature/, bugfix/, hotfix/

2) UI
- Компоненты дизайна: packages/ui/src/components/una
- Сложные компоненты: packages/ui/src/components/complex

3) Монорепо
- Пакеты в packages/* (packages/core, packages/backend, packages/ui, packages/uni-hub)
- Не использовать относительные ../../.. между пакетами — импортировать через workspace package name

4) Линтеры и хуки
- Один общий конфиг в configs/oxlint
- Pre-commit: husky + lint-staged (запуск линтера и форматтера на staged файлах)

5) Документация
- Добавлять MD с описанием публичных API пакета
