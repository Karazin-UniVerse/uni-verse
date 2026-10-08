const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/modals/ApplicantsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalContent = `  const content = loading ? (
    <div className={styles.loadingBox}>
      <Spinner size="large" />
    </div>
  ) : applications.length === 0 ? (
    <Empty description={formatMessage('opportunities.applicants.empty')} />
  ) : (
    <div className={styles.listStack}>
      {applications.map((app) => (`;

const newContent = `  let content;
  
  if (loading) {
    content = (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  } else if (applications.length === 0) {
    content = <Empty description={formatMessage('opportunities.applicants.empty')} />;
  } else {
    content = (
      <div className={styles.listStack}>
        {applications.map((app) => (`;

content = content.replace(originalContent, newContent);

const originalTail2 = `            ))}
    </div>
  );`;

const newTail2 = `            ))}
      </div>
    );
  }`;

content = content.replace(originalTail2, newTail2);

fs.writeFileSync(file, content);
