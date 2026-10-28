'use client';

import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { TabStateWrapper } from './TabStateWrapper';
import type { Opportunity } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import {
  calculatePaymentCounts,
  filterOpportunitiesByPayment,
  filterOpportunitiesBySearch,
} from '../helpers';
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
