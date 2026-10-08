const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/MyOpportunitiesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { OpportunityCard } from '../OpportunityCard';",
  "import { OpportunityCard } from '../OpportunityCard';\nimport { TabStateWrapper } from './TabStateWrapper';",
);

const originalBlock = `  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (myOpportunities.length === 0) {
    return <Empty description="Ви ще не опублікували жодної власної можливості" />;
  }

  return (
    <div className={styles.grid}>
      {myOpportunities.map((opp) => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          variant="owner"
          statusBadge={getStatusBadge(opp.status)}
          onOpenApplicants={onOpenApplicants}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );`;

const newBlock = `  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={myOpportunities.length === 0}
      emptyDescription="Ви ще не опублікували жодної власної можливості"
    >
      <div className={styles.grid}>
        {myOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            variant="owner"
            statusBadge={getStatusBadge(opp.status)}
            onOpenApplicants={onOpenApplicants}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </TabStateWrapper>
  );`;

content = content.replace(originalBlock, newBlock);
fs.writeFileSync(file, content);
