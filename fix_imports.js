const fs = require('fs');

const files = [
  'packages/uni-hub/views/dashboard/tabs/opportunities/MyOpportunitiesTab.tsx',
  'packages/uni-hub/views/dashboard/tabs/opportunities/MyApplicationsTab.tsx',
  'packages/uni-hub/views/dashboard/tabs/opportunities/ModerationQueueTab.tsx',
  'packages/uni-hub/views/dashboard/tabs/opportunities/CatalogTab.tsx',
];

files.forEach((f) => {
  let content = fs.readFileSync(f, 'utf8');

  content = content.replace(/import\s*\{\s*\}\s*from\s*'@una';\n/g, '');
  content = content.replace(
    /import\s*\{\s*Button\s*\}\s*from\s*'@una';\n/g,
    "import { Button } from '@una';\n",
  );
  fs.writeFileSync(f, content);
});

let wrapper = fs.readFileSync(
  'packages/uni-hub/views/dashboard/tabs/opportunities/TabStateWrapper.tsx',
  'utf8',
);

wrapper = wrapper.replace('return <>{children}</>;', 'return children;');
fs.writeFileSync(
  'packages/uni-hub/views/dashboard/tabs/opportunities/TabStateWrapper.tsx',
  wrapper,
);
