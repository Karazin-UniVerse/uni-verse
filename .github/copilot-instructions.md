# UniVerse Project - Copilot Instructions

You are an expert AI programming assistant helping build the "UniVerse" platform.
The project is a monorepo managed with **Turborepo** and **pnpm workspaces**.

## Core Technology Stack
- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS.
- **Backend:** NestJS, Node.js.
- **Database:** PostgreSQL with Prisma ORM.
- **Language:** Strict TypeScript across the entire repository.

## Coding Style & Best Practices

### 1. Code Style & Naming Conventions
- **Variables/Functions**: Use `camelCase`.
- **Classes/Components**: Use `PascalCase`.
- **Constants**: Use `UPPER_SNAKE_CASE`.
- Always write strict TypeScript. Avoid `any`, `unknown` (unless strictly necessary), and implicit types.
- Shared interfaces, types, and DTOs should be placed in the `@universe/types` package to be imported by both frontend and backend.
- Favor explicit return types for all functions.

### 2. UI Components Architecture (`packages/ui`)
- All shared UI components MUST be placed inside `packages/ui/src/components/`.
- **Design System Components**: Core, simple, and reusable components (like buttons, inputs) go into `packages/ui/src/components/una/`.
- **Complex Components**: Composite, business-logic-heavy, or non-design system components go into `packages/ui/src/components/complex/`.

### 2. Backend (NestJS)
- Follow Clean Architecture.
- **Controllers** should only handle HTTP routing, request parsing, and response formatting.
- **Services** should contain all business logic.
- **Prisma** should be injected as a service for database access (managed via the `@universe/database` package).
- Always use dependency injection and keep modules highly cohesive.

### 3. Frontend (Next.js & React)
- Prioritize **React Server Components (RSC)**. Use client components (`"use client"`) only when interactivity or browser APIs (like `useState`, `useEffect`, `window`) are required.
- Push the `"use client"` directive as far down the component tree as possible (to the leaf nodes).
- Use Tailwind CSS for styling. Follow a mobile-first responsive design approach.
- Optimize performance using Next.js caching (`fetch` cache, `unstable_cache`) and React hooks (`useMemo`, `useCallback`) where appropriate.

### 4. Monorepo (Turborepo)
- Keep packages isolated. Do not use relative paths `../../../` to access code outside of the current workspace. Use the package names instead (e.g., `import { Button } from '@universe/ui'`).
- Ensure `package.json` dependencies correctly reference workspace packages (`"workspace:*"`).

### 5. Git Flow & Commits
- **Branch Naming**: Use standard prefixes such as `feature/`, `bugfix/`, `hotfix/`, `chore/` followed by a descriptive name (e.g., `feature/user-auth`).
- **Commit Messages**: Follow Conventional Commits format (e.g., `feat: add user login`, `fix: correct typo in header`, `chore: update dependencies`).

### 6. General AI Instructions
- Before generating code, think through the architecture and how it fits into the monorepo structure.
- When fixing bugs, explain *why* the bug occurred before providing the code.
- Write clean, self-documenting code. Add comments only for complex logic or business rules.
- Prefer smaller, focused PRs and commits.
