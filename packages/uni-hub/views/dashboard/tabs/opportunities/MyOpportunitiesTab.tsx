'use client';

import React from 'react';
import type { Opportunity } from '@uni-hub/types';
import { OpportunityCard } from '../OpportunityCard';
import { TabStateWrapper } from './TabStateWrapper';
import { getStatusBadge } from './badges';
import styles from '../OpportunitiesTab.module.scss';

export interface MyOpportunitiesTabProps {
  loading: boolean;
  myOpportunities: Opportunity[];
  onOpenApplicants: (opp: Opportunity) => void;
  onOpenDetail: (opp: Opportunity) => void;
}

export const MyOpportunitiesTab: React.FC<MyOpportunitiesTabProps> = ({
  loading,
  myOpportunities,
  onOpenApplicants,
  onOpenDetail,
}) => {
  return (
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
  );
};
