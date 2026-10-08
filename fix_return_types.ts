const fs = require('fs');

let content = fs.readFileSync('packages/backend/opportunities/opportunities.controller.ts', 'utf8');

content = content.replace(
  /import { GetUser } from '\.\.\/auth\/decorators\/get-user\.decorator';/,
  "import { GetUser } from '../auth/decorators/get-user.decorator';\nimport { Opportunity, OpportunityApplication } from '@universe/database';",
);

content = content.replace(/create\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);
content = content.replace(/findAll\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<{ data: Opportunity[]; total: number }> {'),
);
content = content.replace(/getMyOpportunities\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity[]> {'),
);
content = content.replace(/getModerationQueue\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity[]> {'),
);
content = content.replace(/getMyApplications\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<OpportunityApplication[]> {'),
);
content = content.replace(/findOne\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);
content = content.replace(/update\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);
content = content.replace(/changeStatus\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);
content = content.replace(/changeLifecycleState\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);
content = content.replace(/getOpportunityApplications\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<OpportunityApplication[]> {'),
);
content = content.replace(/updateApplicationStatus\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<OpportunityApplication> {'),
);
content = content.replace(/apply\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<OpportunityApplication> {'),
);
content = content.replace(/moderate\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, '): Promise<Opportunity> {'),
);

fs.writeFileSync('packages/backend/opportunities/opportunities.controller.ts', content);

let adminContent = fs.readFileSync('packages/backend/admin/admin.controller.ts', 'utf8');

adminContent = adminContent.replace(
  /import { Role } from '@universe\/database';/,
  "import { Role, User } from '@universe/database';",
);
adminContent = adminContent.replace(/getUsers\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, "): Promise<Omit<User, 'password'>[]> {"),
);
adminContent = adminContent.replace(/setRole\([\s\S]*?\)\s*\{/g, (match) =>
  match.replace(/\) \{$/, "): Promise<Omit<User, 'password'>> {"),
);
fs.writeFileSync('packages/backend/admin/admin.controller.ts', adminContent);
