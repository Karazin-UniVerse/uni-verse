const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/MyApplicationsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { getApplicationStatusBadge } from './badges';",
  "import { getApplicationStatusBadge } from './badges';\nimport { TabStateWrapper } from './TabStateWrapper';",
);

const originalBlock = `  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (myApplications.length === 0) {
    return <Empty description="Ви ще не відгукувалися на жодну можливість" />;
  }

  return (
    <div className={styles.listStack}>`;

const newBlock = `  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={myApplications.length === 0}
      emptyDescription="Ви ще не відгукувалися на жодну можливість"
    >
      <div className={styles.listStack}>`;

content = content.replace(originalBlock, newBlock);
content = content.replace(
  /    <\/div>\n  \);\n};\n$/,
  '    </div>\n    </TabStateWrapper>\n  );\n};\n',
);
fs.writeFileSync(file, content);
