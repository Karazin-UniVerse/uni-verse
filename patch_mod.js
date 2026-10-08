const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/ModerationQueueTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import type { Opportunity } from '@uni-hub/types';",
  "import type { Opportunity } from '@uni-hub/types';\nimport { TabStateWrapper } from './TabStateWrapper';",
);

const originalBlock = `  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (moderationQueue.length === 0) {
    return (
      <Empty description="Черга модерації порожня! Немає нових можливостей для перевірки." />
    );
  }

  return (
    <div className={styles.listStack}>`;

const newBlock = `  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={moderationQueue.length === 0}
      emptyDescription="Черга модерації порожня! Немає нових можливостей для перевірки."
    >
      <div className={styles.listStack}>`;

content = content.replace(originalBlock, newBlock);
content = content.replace(
  /    <\/div>\n  \);\n};\n$/,
  '    </div>\n    </TabStateWrapper>\n  );\n};\n',
);
fs.writeFileSync(file, content);
