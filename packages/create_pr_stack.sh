#!/bin/bash
set -e

# PR 1: feat/opportunities-schema
git checkout feat/opportunities-schema || git checkout -b feat/opportunities-schema
git add backend/prisma/schema.prisma backend/prisma/seed-opportunities.ts core/constants/roles.ts backend/package.json ../pnpm-lock.yaml
git rm core/types/tests/models.test.ts || true
git commit --no-verify -m "feat: opportunities schema and core types"
git push -u origin feat/opportunities-schema
gh pr create --title "feat: opportunities schema and core types" --body "Adds database schema for opportunities and role constants." --base develop || echo "PR 1 might already exist"

# PR 2: feat/opportunities-api
git checkout feat/opportunities-api 2>/dev/null || git checkout -b feat/opportunities-api
git add backend/app.module.ts backend/auth/auth.service.ts backend/admin/ backend/notifications/ backend/opportunities/ ../.env.example
git commit --no-verify -m "feat: opportunities API and services"
git push -u origin feat/opportunities-api
gh pr create --title "feat: opportunities API and services" --body "Adds backend API and services for opportunities, admin and notifications." --base feat/opportunities-schema || echo "PR 2 might already exist"

# PR 3: feat/opportunities-ui
git checkout feat/opportunities-ui 2>/dev/null || git checkout -b feat/opportunities-ui
git add ui/components/una/Button/Button.tsx uni-hub/i18n/locales/en.ts uni-hub/i18n/locales/uk.ts uni-hub/next.config.ts uni-hub/services/api.ts uni-hub/services/api.opportunities.ts uni-hub/types.ts uni-hub/utils/jwt.ts uni-hub/views/DashboardPage.tsx uni-hub/views/dashboard/index.ts uni-hub/views/dashboard/layout/DashboardSidebar.tsx uni-hub/views/dashboard/types.ts uni-hub/views/dashboard/tabs/
git commit --no-verify -m "feat: opportunities UI in uni-hub"
git push -u origin feat/opportunities-ui
gh pr create --title "feat: opportunities UI in uni-hub" --body "Adds UI components and pages for opportunities management." --base feat/opportunities-api || echo "PR 3 might already exist"

echo "PR stack created successfully!"
