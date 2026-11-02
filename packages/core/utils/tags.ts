import { OPPORTUNITY_STATUS } from '../constants/opportunities.ts';
import type { Opportunity } from '../types/opportunities.ts';

export const normalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, ' ').toLowerCase();

export const normalizeTags = (tags: unknown[]): string[] => {
  const normalized = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(normalizeTag)
    .filter(Boolean);

  return [...new Set(normalized)];
};

export const getOpportunityTagNames = ({
  status,
  tags,
  proposedTags,
}: Pick<Opportunity, 'status' | 'tags' | 'proposedTags'>): string[] => {
  if (status === OPPORTUNITY_STATUS.PUBLISHED) {
    return (tags ?? []).map((tag) => tag.name);
  }

  return proposedTags ?? [];
};
