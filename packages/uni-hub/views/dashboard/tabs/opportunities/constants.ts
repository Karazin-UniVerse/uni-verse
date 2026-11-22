import { OPPORTUNITY_LIFECYCLE, type OpportunityLifecycle } from '@core/constants/opportunities';
import type { TranslationKey } from '@uni-hub/i18n/translations';

export const OPPORTUNITY_SUB_TAB = {
  Catalog: 'catalog',
  Favorites: 'favorites',
  MyOpportunities: 'my-opportunities',
  MyApplications: 'my-applications',
  Moderation: 'moderation',
} as const;

export type OpportunitySubTab = (typeof OPPORTUNITY_SUB_TAB)[keyof typeof OPPORTUNITY_SUB_TAB];

export const OPPORTUNITY_SUB_TABS = Object.values(OPPORTUNITY_SUB_TAB);

export const CATALOG_POLL_INTERVAL_MS = 30_000;

export const OPPORTUNITY_CARD_VARIANT = {
  CATALOG: 'catalog',
  OWNER: 'owner',
} as const;

export type OpportunityCardVariant =
  (typeof OPPORTUNITY_CARD_VARIANT)[keyof typeof OPPORTUNITY_CARD_VARIANT];

export const OPPORTUNITY_LIFECYCLE_LABEL_KEYS: Record<OpportunityLifecycle, TranslationKey> = {
  [OPPORTUNITY_LIFECYCLE.START]: 'opportunities.detailModal.phaseStart',
  [OPPORTUNITY_LIFECYCLE.ACTIVE]: 'opportunities.detailModal.phaseActive',
  [OPPORTUNITY_LIFECYCLE.PAUSED]: 'opportunities.detailModal.phasePaused',
  [OPPORTUNITY_LIFECYCLE.COMPLETED]: 'opportunities.detailModal.phaseCompleted',
  [OPPORTUNITY_LIFECYCLE.CANCELLED]: 'opportunities.detailModal.phaseCancelled',
};
