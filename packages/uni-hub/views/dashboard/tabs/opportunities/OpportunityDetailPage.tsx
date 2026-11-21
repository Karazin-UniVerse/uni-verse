'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner, Button } from '@una';
import { useRouter } from 'next/navigation';
import { OPPORTUNITIES_ROUTE } from '@core/constants/routes';
import { OpportunityUnavailableNotice } from './components/OpportunityUnavailableNotice';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { opportunityDetailQueryOptions } from './queries';
import { isUnavailableOpportunity } from '@core/utils/opportunities';

export interface OpportunityDetailPageProps {
  opportunityId: string;
}

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({ opportunityId }) => {
  const { formatMessage } = useLanguage();
  const router = useRouter();
  const detailQuery = useQuery(opportunityDetailQueryOptions(opportunityId));

  if (detailQuery.isLoading) {
    return <Spinner tip={formatMessage('dashboard.updating')} />;
  }

  if (!detailQuery.data) {
    return <LoadErrorState onRetry={() => void detailQuery.refetch()} />;
  }

  if (isUnavailableOpportunity(detailQuery.data)) {
    return (
      <div>
        <Button variant="secondary" onClick={() => router.push(OPPORTUNITIES_ROUTE)}>
          {formatMessage('opportunities.detail.back')}
        </Button>
        <OpportunityUnavailableNotice availability={detailQuery.data.availability} />
      </div>
    );
  }

  return <OpportunityDetailContent opportunity={detailQuery.data} />;
};
