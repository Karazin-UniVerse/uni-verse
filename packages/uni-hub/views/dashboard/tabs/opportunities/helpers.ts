import { getErrorMessage } from '@uni-hub/services/api';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import {
  OPPORTUNITY_ERROR,
  OPPORTUNITY_LIFECYCLE,
  type OpportunityPaymentType,
} from '@core/constants/opportunities';
import type { Opportunity } from '@core/types/opportunities';

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

export function filterOpportunitiesBySearch(
  opportunities: Opportunity[],
  search: string,
): Opportunity[] {
  if (!search.trim()) {
    return opportunities;
  }

  const query = search.trim().toLowerCase();

  return opportunities.filter((opportunity) => {
    const titleMatch = opportunity.title.toLowerCase().includes(query);
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

export function calculatePaymentCounts(opportunities: Opportunity[]): OpportunityPaymentCounts {
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

export function filterOpportunitiesByPayment(
  opportunities: Opportunity[],
  paymentFilter: OpportunityPaymentType | '',
): Opportunity[] {
  if (!paymentFilter) {
    return opportunities;
  }

  return opportunities.filter((opportunity) => opportunity.paymentType === paymentFilter);
}

export function filterOpportunitiesByRecruiting(
  opportunities: Opportunity[],
  isRecruiting: boolean,
): Opportunity[] {
  if (!isRecruiting) {
    return opportunities;
  }

  return opportunities.filter(
    (opportunity) =>
      opportunity.acceptsApplications === true &&
      (opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.START ||
        opportunity.lifecycleState === OPPORTUNITY_LIFECYCLE.ACTIVE),
  );
}

export function filterOpportunitiesByTags(
  opportunities: Opportunity[],
  tags: string[],
): Opportunity[] {
  if (!tags.length) {
    return opportunities;
  }

  const normalizedFilters = tags.map((tag) => tag.toLowerCase());

  return opportunities.filter((opportunity) => {
    const tagNames = (opportunity.tags?.map((tag) => tag.name.toLowerCase()) ?? []).concat(
      opportunity.proposedTags?.map((tag) => tag.toLowerCase()) ?? [],
    );

    return tagNames.some((name) => normalizedFilters.includes(name));
  });
}
