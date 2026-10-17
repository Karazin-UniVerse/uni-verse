'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@una';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { opportunityDetailQueryOptions } from './queries';

export interface OpportunityDetailPageProps {
  opportunityId: string;
}

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({ opportunityId }) => {
  const { formatMessage } = useLanguage();
  const detailQuery = useQuery(opportunityDetailQueryOptions(opportunityId));

  if (detailQuery.isLoading) {
    return <Spinner tip={formatMessage('dashboard.updating')} />;
  }

  if (!detailQuery.data) {
    return <LoadErrorState onRetry={() => void detailQuery.refetch()} />;
  }

  return <OpportunityDetailContent opportunity={detailQuery.data} />;
};
