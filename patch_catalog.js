const fs = require('fs');
const file = 'packages/uni-hub/views/dashboard/tabs/opportunities/CatalogTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { Spinner, Empty } from '@una';",
  "import { Spinner, Empty } from '@una';\nimport { TabStateWrapper } from './TabStateWrapper';",
);

const originalGrid = `      {loading ? (
        <div className={styles.loadingBox}>
          <Spinner size="large" />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Empty description="За вашим запитом не знайдено доступних можливостей" />
      ) : (
        <div className={styles.grid}>
          {filteredOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}`;

const newGrid = `      <TabStateWrapper
        loading={loading}
        isEmpty={filteredOpportunities.length === 0}
        emptyDescription="За вашим запитом не знайдено доступних можливостей"
      >
        <div className={styles.grid}>
          {filteredOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      </TabStateWrapper>`;

content = content.replace(originalGrid, newGrid);
fs.writeFileSync(file, content);
