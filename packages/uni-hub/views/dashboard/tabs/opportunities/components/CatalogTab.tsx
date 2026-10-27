'use client';

import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { TabStateWrapper } from './TabStateWrapper';
import type { Opportunity } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import { OpportunityCard } from '../../OpportunityCard';
import styles from '../../OpportunitiesTab.module.scss';

export interface CatalogTabProps {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  opportunities: Opportunity[];
  search: string;
  onSearchChange: (val: string) => void;
  paymentFilter: OpportunityPaymentType | '';
  onPaymentFilterChange: (val: OpportunityPaymentType | '') => void;
  onOpenDetail: (opp: Opportunity) => void;
}

interface PaymentCounts {
  all: number;
  paid: number;
  unpaid: number;
}

function filterOpportunitiesBySearch(opportunities: Opportunity[], search: string): Opportunity[] {
  if (!search.trim()) {
    return opportunities;
  }

  const query = search.trim().toLowerCase();

  return opportunities.filter((opportunity) => {
    const titleMatch = opportunity.title.toLowerCase().includes(query);
    const descMatch = opportunity.description.toLowerCase().includes(query);
    const ownerMatch =
      Boolean(opportunity.owner?.name?.toLowerCase().includes(query)) ||
      Boolean(opportunity.owner?.email.toLowerCase().includes(query)) ||
      opportunity.ownerContactInfo.toLowerCase().includes(query);

    return titleMatch || descMatch || ownerMatch;
  });
}

function calculatePaymentCounts(opportunities: Opportunity[]): PaymentCounts {
  let all = 0;
  let paid = 0;
  let unpaid = 0;

  for (const opportunity of opportunities) {
    all += 1;

    if (opportunity.paymentType === 'PAID') {
      paid += 1;
    } else if (opportunity.paymentType === 'UNPAID') {
      unpaid += 1;
    }
  }

  return { all, paid, unpaid };
}

function filterOpportunitiesByPayment(
  opportunities: Opportunity[],
  paymentFilter: OpportunityPaymentType | '',
): Opportunity[] {
  if (!paymentFilter) {
    return opportunities;
  }

  return opportunities.filter((opportunity) => opportunity.paymentType === paymentFilter);
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  loading,
  isError,
  onRetry,
  opportunities,
  search,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  onOpenDetail,
}) => {
  const { formatMessage } = useLanguage();

  const searchedOpportunities = useMemo(
    () => filterOpportunitiesBySearch(opportunities, search),
    [opportunities, search],
  );

  const counts = useMemo(
    () => calculatePaymentCounts(searchedOpportunities),
    [searchedOpportunities],
  );

  const filteredOpportunities = useMemo(
    () => filterOpportunitiesByPayment(searchedOpportunities, paymentFilter),
    [searchedOpportunities, paymentFilter],
  );

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={formatMessage('opportunities.catalog.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={formatMessage('opportunities.catalog.searchAria')}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => onSearchChange('')}
              aria-label={formatMessage('opportunities.catalog.clearSearchAria')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filterControls}>
          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${paymentFilter === '' ? styles.activeChip : ''}`}
              onClick={() => onPaymentFilterChange('')}
              aria-label={`${formatMessage('opportunities.catalog.filterAll')} (${counts.all})`}
            >
              <span>{formatMessage('opportunities.catalog.filterAll')}</span>
              <span className={styles.chipCount}>({counts.all})</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${paymentFilter === 'PAID' ? styles.activeChip : ''}`}
              onClick={() => onPaymentFilterChange('PAID')}
              aria-label={`${formatMessage('opportunities.catalog.filterPaid')} (${counts.paid})`}
            >
              <span>{formatMessage('opportunities.catalog.filterPaid')}</span>
              <span className={styles.chipCount}>({counts.paid})</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${paymentFilter === 'UNPAID' ? styles.activeChip : ''}`}
              onClick={() => onPaymentFilterChange('UNPAID')}
              aria-label={`${formatMessage('opportunities.catalog.filterUnpaid')} (${counts.unpaid})`}
            >
              <span>{formatMessage('opportunities.catalog.filterUnpaid')}</span>
              <span className={styles.chipCount}>({counts.unpaid})</span>
            </button>
          </div>
        </div>
      </div>

      <TabStateWrapper
        loading={loading}
        isError={isError}
        onRetry={onRetry}
        isEmpty={filteredOpportunities.length === 0}
        emptyDescription={formatMessage('opportunities.catalog.emptyDescription')}
      >
        <div className={styles.grid}>
          {filteredOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      </TabStateWrapper>
    </>
  );
};
