'use client';

import React from 'react';
import type { Opportunity } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityCard } from '../OpportunityCard';
import { TabStateWrapper } from './TabStateWrapper';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';
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
  const { formatMessage } = useLanguage();

  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={myOpportunities.length === 0}
      emptyDescription={formatMessage('opportunities.myOpportunities.empty')}
    >
      <div className={styles.grid}>
        {myOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            variant="owner"
            statusBadge={<OpportunityStatusBadge status={opp.status} />}
            onOpenApplicants={onOpenApplicants}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </TabStateWrapper>
  );
};
