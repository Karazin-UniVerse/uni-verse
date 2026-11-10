'use client';

import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityFilterPanel, type OpportunityFilterValue } from '@ui';
import { TabStateWrapper } from './TabStateWrapper';
import type { Opportunity, OpportunityListItem } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunityTag } from '@core/constants/tags';
import {
  filterOpportunitiesByPayment,
  filterOpportunitiesByRecruiting,
  filterOpportunitiesBySearch,
  getCatalogEmptyKey,
  canToggleFavorite,
  filterOpportunitiesByTags,
} from '../helpers';
import { getOpportunityTagGroups, getOpportunityTagLabel } from '../tags';
import { OpportunityCard } from '../../OpportunityCard';
import styles from '../../OpportunitiesTab.module.scss';

export interface CatalogTabProps {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  opportunities: OpportunityListItem[];
  search: string;
  onSearchChange: (val: string) => void;
  onOpenDetail: (opp: Opportunity) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  favoritesDisabled?: boolean;
  pendingFavoriteIds?: readonly string[];
  currentUserId?: string | null;
  favoritesView?: boolean;
  paymentFilter?: OpportunityPaymentType | '';
  onPaymentFilterChange?: (val: OpportunityPaymentType | '') => void;
  isRecruiting?: boolean;
  onRecruitingChange?: (val: boolean) => void;
  tags?: OpportunityTag[];
  onTagsChange?: (tags: OpportunityTag[]) => void;
  onFiltersChange?: (filters: OpportunityFilterValue) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  loading,
  isError,
  onRetry,
  opportunities,
  search,
  onSearchChange,
  onPaymentFilterChange,
  onRecruitingChange,
  onTagsChange,
  onFiltersChange,
  onOpenDetail,
  favoriteIds,
  onToggleFavorite,
  favoritesDisabled,
  pendingFavoriteIds,
  currentUserId,
  paymentFilter = '',
  isRecruiting = false,
  tags = [],
  favoritesView = false,
}) => {
  const { formatMessage } = useLanguage();

  const filteredOpportunities = useMemo(() => {
    let result = filterOpportunitiesBySearch(opportunities, search, (tag) =>
      getOpportunityTagLabel(tag, formatMessage),
    );

    result = filterOpportunitiesByPayment(result, paymentFilter);
    result = filterOpportunitiesByRecruiting(result, isRecruiting);
    result = filterOpportunitiesByTags(result, tags);

    return result;
  }, [opportunities, search, paymentFilter, isRecruiting, tags, formatMessage]);

  const handleApplyFilters = (newFilters: OpportunityFilterValue): void => {
    onFiltersChange?.(newFilters);
    onPaymentFilterChange?.(newFilters.paymentType);
    onRecruitingChange?.(newFilters.isRecruiting);
    onTagsChange?.(newFilters.tags);
  };

  const emptyKey = getCatalogEmptyKey({ search, paymentFilter, favoritesView, isRecruiting, tags });

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchAndFilterRow}>
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

          <OpportunityFilterPanel
            value={{
              paymentType: paymentFilter,
              isRecruiting,
              tags,
            }}
            onApply={handleApplyFilters}
            tagGroups={getOpportunityTagGroups(formatMessage)}
            labels={{
              open: formatMessage('opportunities.catalog.filtersButton'),
              close: formatMessage('opportunities.catalog.filtersClose'),
              title: formatMessage('opportunities.catalog.filtersTitle'),
              paymentType: formatMessage('opportunities.catalog.filterPaymentLabel'),
              paymentAll: formatMessage('opportunities.catalog.filterAll'),
              paymentPaid: formatMessage('opportunities.catalog.filterPaid'),
              paymentUnpaid: formatMessage('opportunities.catalog.filterUnpaid'),
              recruiting: formatMessage('opportunities.catalog.filterRecruiting'),
              tags: formatMessage('opportunities.catalog.filterTagsLabel'),
              tagsPlaceholder: formatMessage('opportunities.catalog.filterTagsPlaceholder'),
              removeTag: formatMessage('opportunities.tags.remove'),
              apply: formatMessage('opportunities.catalog.filtersApply'),
            }}
          />
        </div>
      </div>

      <TabStateWrapper
        loading={loading}
        isError={isError}
        onRetry={onRetry}
        isEmpty={filteredOpportunities.length === 0}
        emptyDescription={formatMessage(emptyKey)}
      >
        <div className={styles.grid}>
          {filteredOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onOpenDetail={onOpenDetail}
              isFavorite={favoriteIds?.has(opp.id) ?? false}
              onToggleFavorite={
                canToggleFavorite(opp, currentUserId) ? onToggleFavorite : undefined
              }
              favoriteDisabled={favoritesDisabled || pendingFavoriteIds?.includes(opp.id)}
            />
          ))}
        </div>
      </TabStateWrapper>
    </>
  );
};
