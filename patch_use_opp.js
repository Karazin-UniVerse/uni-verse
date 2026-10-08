const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/useOpportunities.ts';
let content = fs.readFileSync(file, 'utf8');

const original = `      toast.success(
        action === 'APPROVE'
          ? formatMessage('opportunities.toast.approved')
          : action === 'REJECT'
            ? formatMessage('opportunities.toast.rejected')
            : formatMessage('opportunities.toast.requiresChanges'),
      );`;

const replacement = `      const toastMap = {
        APPROVE: 'opportunities.toast.approved',
        REJECT: 'opportunities.toast.rejected',
        REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
      } as const;
      toast.success(formatMessage(toastMap[action]));`;

content = content.replace(original, replacement);
fs.writeFileSync(file, content);
