'use client';

import React from 'react';
import type { OpportunityApplication } from '@core/types/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { MyApplicationCard } from './MyApplicationCard';
import { TabStateWrapper } from './TabStateWrapper';
import styles from '../../OpportunitiesTab.module.scss';

export interface MyApplicationsTabProps {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  myApplications: OpportunityApplication[];
  onWithdraw: (appId: string) => void;
}

export const MyApplicationsTab: React.FC<MyApplicationsTabProps> = ({
  loading,
  isError,
  onRetry,
  myApplications,
  onWithdraw,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <TabStateWrapper
      loading={loading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={myApplications.length === 0}
      emptyDescription={formatMessage('opportunities.myApplications.empty')}
    >
      <div className={styles.listStack}>
        {myApplications.map((application) => (
          <MyApplicationCard
            key={application.id}
            application={application}
            onWithdraw={onWithdraw}
          />
        ))}
      </div>
    </TabStateWrapper>
  );
};
