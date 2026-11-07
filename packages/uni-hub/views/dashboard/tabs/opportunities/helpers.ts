import { getErrorMessage } from '@uni-hub/services/api';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import {
  OPPORTUNITY_ERROR,
  OPPORTUNITY_LIFECYCLE,
  type OpportunityPaymentType,
} from '@core/constants/opportunities';
import type { OpportunityListItem } from '@core/types/opportunities';
import { isUnavailableOpportunity } from '@core/utils/opportunities';
import type { TranslationKey } from '@uni-hub/i18n/locales/uk';

export function getCatalogEmptyKey({
  search,
  paymentFilter,
  favoritesView,
  isRecruiting = false,
  tags = [],
}: {
  search: string;
  paymentFilter: OpportunityPaymentType | '';
  favoritesView: boolean;
  isRecruiting?: boolean;
  tags?: string[];
}): TranslationKey {
  if (search.trim() || paymentFilter || isRecruiting || tags.length) {
    return 'opportunities.filteredEmpty';
  }

  return favoritesView ? 'opportunities.favorites.empty' : 'opportunities.catalog.emptyDescription';
}

export function canToggleFavorite(
  opportunity: OpportunityListItem,
  currentUserId?: string | null,
): boolean {
  return (
    Boolean(currentUserId) &&
    (isUnavailableOpportunity(opportunity) || opportunity.ownerId !== currentUserId)
  );
}

export interface OpportunityPaymentCounts {
  all: number;
  paid: number;
  unpaid: number;
}

export function getOpportunityErrorMessage(
  error: unknown,
  formatMessage: FormatMessage,
  fallback: string,
): string {
  const message = getErrorMessage(error, fallback);
  const key = Object.values(OPPORTUNITY_ERROR).find(
    (value) => message === value || message.startsWith(`${value} (HTTP `),
  );

  return key ? formatMessage(key) : message;
}

export function filterOpportunitiesBySearch<T extends OpportunityListItem>(
  opportunities: T[],
  search: string,
): T[] {
  if (!search.trim()) {
    return opportunities;
  }

  const query = search.trim().toLowerCase();

  return opportunities.filter((opportunity) => {
    const titleMatch = opportunity.title.toLowerCase().includes(query);

    if (isUnavailableOpportunity(opportunity)) {
      return titleMatch;
    }

    const descMatch = opportunity.description.toLowerCase().includes(query);
    const ownerMatch =
      Boolean(opportunity.owner?.name?.toLowerCase().includes(query)) ||
      Boolean(opportunity.owner?.email?.toLowerCase().includes(query)) ||
      opportunity.ownerContactInfo.toLowerCase().includes(query);
    const tagsMatch =
      Boolean(opportunity.tags?.some((tag) => tag.name.toLowerCase().includes(query))) ||
      Boolean(opportunity.proposedTags?.some((tag) => tag.toLowerCase().includes(query)));

    return titleMatch || descMatch || ownerMatch || tagsMatch;
  });
}

export function calculatePaymentCounts(
  opportunities: OpportunityListItem[],
): OpportunityPaymentCounts {
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

export function filterOpportunitiesByPayment<T extends OpportunityListItem>(
  opportunities: T[],
  paymentFilter: OpportunityPaymentType | '',
): T[] {
  if (!paymentFilter) {
    return opportunities;
  }

  return opportunities.filter((opportunity) => opportunity.paymentType === paymentFilter);
}

export function filterOpportunitiesByRecruiting<T extends OpportunityListItem>(
  opportunities: T[],
  isRecruiting: boolean,
): T[] {
  if (!isRecruiting) {
    return opportunities;
  }

  return opportunities.filter(
    (opportunity) =>
      !isUnavailableOpportunity(opportunity) &&
      opportunity.acceptsApplications === true &&
      (opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.START ||
        opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.ACTIVE),
  );
}

export function filterOpportunitiesByTags<T extends OpportunityListItem>(
  opportunities: T[],
  tags: string[],
): T[] {
  if (!tags.length) {
    return opportunities;
  }

  const normalizedFilters = new Set(tags.map((tag) => tag.toLowerCase()));

  return opportunities.filter((opportunity) => {
    if (isUnavailableOpportunity(opportunity)) {
      return false;
    }

    const tagNames = (opportunity.tags?.map((tag) => tag.name.toLowerCase()) ?? []).concat(
      opportunity.proposedTags?.map((tag) => tag.toLowerCase()) ?? [],
    );

    return tagNames.some((name) => normalizedFilters.has(name));
  });
}
