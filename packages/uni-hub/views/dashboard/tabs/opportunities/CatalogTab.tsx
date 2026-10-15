'use client';

import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { TabStateWrapper } from './TabStateWrapper';
import type { Opportunity, OpportunityPaymentType } from '@uni-hub/types';
import { OpportunityCard } from '../OpportunityCard';
import styles from '../OpportunitiesTab.module.scss';

export interface CatalogTabProps {
  loading: boolean;
  opportunities: Opportunity[];
  search: string;
  onSearchChange: (val: string) => void;
  paymentFilter: OpportunityPaymentType | '';
  onPaymentFilterChange: (val: OpportunityPaymentType | '') => void;
  onOpenDetail: (opp: Opportunity) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  loading,
  opportunities,
  search,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  onOpenDetail,
}) => {
  const { formatMessage } = useLanguage();
  // Filter catalog opportunities in memory without cascading re-renders or spinner flashes
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (paymentFilter && opp.paymentType !== paymentFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const titleMatch = opp.title.toLowerCase().includes(q);
        const descMatch = opp.description.toLowerCase().includes(q);
        const ownerMatch =
          Boolean(opp.owner?.name?.toLowerCase().includes(q)) ||
          Boolean(opp.owner?.email.toLowerCase().includes(q)) ||
          opp.ownerContactInfo.toLowerCase().includes(q);

        return titleMatch || descMatch || ownerMatch;
      }

      return true;
    });
  }, [opportunities, paymentFilter, search]);

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
            >
              {formatMessage('opportunities.catalog.filterAll')}
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${paymentFilter === 'PAID' ? styles.activeChip : ''}`}
              onClick={() => onPaymentFilterChange('PAID')}
            >
              {formatMessage('opportunities.catalog.filterPaid')}
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${paymentFilter === 'UNPAID' ? styles.activeChip : ''}`}
              onClick={() => onPaymentFilterChange('UNPAID')}
            >
              {formatMessage('opportunities.catalog.filterUnpaid')}
            </button>
          </div>

          {!loading && (
            <span className={styles.resultCount}>
              {formatMessage('opportunities.catalog.foundPrefix')}{' '}
              <strong>{filteredOpportunities.length}</strong>
            </span>
          )}
        </div>
      </div>

      <TabStateWrapper
        loading={loading}
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
