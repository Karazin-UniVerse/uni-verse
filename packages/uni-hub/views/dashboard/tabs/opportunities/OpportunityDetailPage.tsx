'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BackButton } from '@ui';
import { Spinner } from '@una';
import { useRouter } from 'next/navigation';
import { OPPORTUNITIES_ROUTE } from '@core/constants/routes';
import { isUnavailableOpportunity } from '@core/utils/opportunities';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { FavoriteToggleButton } from './components/FavoriteToggleButton';
import { OpportunityUnavailableNotice } from './components/OpportunityUnavailableNotice';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { useFavorites } from './hooks/useFavorites';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { opportunityDetailQueryOptions } from './queries';
import styles from './OpportunityDetailPage.module.scss';

export interface OpportunityDetailPageProps {
  opportunityId: string;
}

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({ opportunityId }) => {
  const { formatMessage } = useLanguage();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const detailQuery = useQuery(opportunityDetailQueryOptions(opportunityId));
  const favorites = useFavorites(Boolean(currentUser.userId));

  if (detailQuery.isLoading) {
    return <Spinner tip={formatMessage('dashboard.updating')} />;
  }

  if (!detailQuery.data) {
    return <LoadErrorState onRetry={() => void detailQuery.refetch()} />;
  }

  if (isUnavailableOpportunity(detailQuery.data)) {
    const unavailableOpportunity = detailQuery.data;
    const isPending = favorites.pendingIds.includes(unavailableOpportunity.id);
    const isSaved = favorites.savedIds.has(unavailableOpportunity.id);
    const isToggleDisabled =
      favorites.query.isLoading || hasLoadFailed(favorites.query) || isPending;

    return (
      <div className={styles.unavailablePage}>
        <div className={styles.unavailableTopBar}>
          <BackButton
            label={formatMessage('opportunities.detail.back')}
            onClick={() => router.push(OPPORTUNITIES_ROUTE)}
          />
          {Boolean(currentUser.userId) && (isSaved || isPending) && (
            <FavoriteToggleButton
              isFavorite={isSaved}
              disabled={isToggleDisabled}
              onToggle={() => favorites.toggle(unavailableOpportunity.id, isSaved)}
            />
          )}
        </div>
        <h3 className={styles.unavailableTitle}>
          {unavailableOpportunity.title ||
            formatMessage('opportunities.myApplications.defaultTitle')}
        </h3>
        <OpportunityUnavailableNotice availability={unavailableOpportunity.availability} />
      </div>
    );
  }

  return <OpportunityDetailContent opportunity={detailQuery.data} />;
};
