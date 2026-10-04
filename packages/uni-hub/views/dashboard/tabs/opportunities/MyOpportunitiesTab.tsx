'use client';

import React from 'react';
import { Spinner, Empty } from '@una';
import type { Opportunity } from '@uni-hub/types';
import { OpportunityCard } from '../OpportunityCard';
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
  if (loading) {
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
  );
};
