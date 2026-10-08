/* eslint-disable */
const fs = require('fs');
const path = require('path');

// 1. Fix admin.controller.ts
let adminCtrl = fs.readFileSync('backend/admin/admin.controller.ts', 'utf8');

adminCtrl = adminCtrl.replace(
  "import { ApiTags, ApiOperation } from '@nestjs/swagger';",
  "import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';",
);
adminCtrl = adminCtrl.replace(
  "@Get('users')\n  @ApiOperation({ summary: 'Get all users' })",
  "@ApiBearerAuth()\n  @Get('users')\n  @ApiOperation({ summary: 'Get all users' })",
);
adminCtrl = adminCtrl.replace(
  "getUsers(@GetUser('role') role: string) {",
  "getUsers(@GetUser('role') role: string): Promise<any> {",
);
adminCtrl = adminCtrl.replace(
  "@Put('users/:id/role')\n  @ApiOperation({ summary: 'Set user role' })",
  "@ApiBearerAuth()\n  @Put('users/:id/role')\n  @ApiOperation({ summary: 'Set user role' })",
);
adminCtrl = adminCtrl.replace(
  "setRole(@GetUser('role') callerRole: string, @Param('id') userId: string, @Body('role') newRole: string) {",
  "setRole(@GetUser('role') callerRole: string, @Param('id') userId: string, @Body('role') newRole: string): Promise<any> {",
);
fs.writeFileSync('backend/admin/admin.controller.ts', adminCtrl);

// 2. Fix admin.service.ts
let adminSvc = fs.readFileSync('backend/admin/admin.service.ts', 'utf8');

adminSvc = adminSvc.replace(
  'async setRole(userId: string, role: any)',
  'async setRole(userId: string, role: string)',
);
fs.writeFileSync('backend/admin/admin.service.ts', adminSvc);

// 3. Fix seed-opportunities.ts
let seedOpp = fs.readFileSync('backend/prisma/seed-opportunities.ts', 'utf8');

seedOpp = seedOpp.replace(/console\.log/g, 'console.info');
fs.writeFileSync('backend/prisma/seed-opportunities.ts', seedOpp);

// 4. Fix opportunities.service.ts
let oppSvc = fs.readFileSync('backend/opportunities/opportunities.service.ts', 'utf8');

oppSvc = oppSvc.replace('const where: any = {', 'const where: Record<string, unknown> = {');
oppSvc = oppSvc.replace(
  'async changeLifecycleState(userId: string, id: string, lifecycleState: any)',
  "async changeLifecycleState(userId: string, id: string, lifecycleState: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')",
);
oppSvc = oppSvc.replace(
  'async updateApplicationStatus(userId: string, applicationId: string, status: any, ownerComment?: string)',
  "async updateApplicationStatus(userId: string, applicationId: string, status: 'APPROVED' | 'REJECTED' | 'WAITLISTED', ownerComment?: string)",
);
oppSvc = oppSvc.replace(
  "let newStatus: any = 'DRAFT';",
  "let newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'DRAFT';",
);
fs.writeFileSync('backend/opportunities/opportunities.service.ts', oppSvc);

// 5. Fix OpportunitiesTab.tsx
let oppTab = fs.readFileSync('uni-hub/views/dashboard/tabs/OpportunitiesTab.tsx', 'utf8');

oppTab = oppTab.replace(
  `  useEffect(() => {
    if (activeSubTab === 'catalog') {
      void fetchCatalog();
    } else if (activeSubTab === 'my-opportunities') {
      void fetchMyOpportunities();
    } else if (activeSubTab === 'moderation-queue') {
      void fetchModerationQueue();
    } else if (activeSubTab === 'my-applications') {
      void fetchMyApplications();
    }
  }, [activeSubTab, fetchCatalog, fetchMyOpportunities, fetchModerationQueue, fetchMyApplications]);`,
  `  const loadActiveSubTab = useCallback(() => {
    if (activeSubTab === 'catalog') {
      void fetchCatalog();
    } else if (activeSubTab === 'my-opportunities') {
      void fetchMyOpportunities();
    } else if (activeSubTab === 'moderation-queue') {
      void fetchModerationQueue();
    } else if (activeSubTab === 'my-applications') {
      void fetchMyApplications();
    }
  }, [activeSubTab, fetchCatalog, fetchMyOpportunities, fetchModerationQueue, fetchMyApplications]);

  useEffect(() => {
    loadActiveSubTab();
  }, [loadActiveSubTab]);`,
);
fs.writeFileSync('uni-hub/views/dashboard/tabs/OpportunitiesTab.tsx', oppTab);
