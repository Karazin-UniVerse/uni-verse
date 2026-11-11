import type { MultiSelectGroup, TagTone } from '@una';
import {
  OPPORTUNITY_TAG_GROUPS,
  type OpportunityTag,
  type OpportunityTagCategory,
} from '@core/constants/tags';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';

const CATEGORY_TONE: Record<OpportunityTagCategory, TagTone> = {
  FORMAT: 'info',
  FIELD: 'success',
  EXPERIENCE: 'warning',
  LOCATION: 'neutral',
};

export function getOpportunityTagLabel(tag: OpportunityTag, formatMessage: FormatMessage): string {
  return formatMessage(`opportunities.tags.value.${tag}`);
}

export function getOpportunityTagGroups(
  formatMessage: FormatMessage,
): MultiSelectGroup<OpportunityTag>[] {
  return Object.entries(OPPORTUNITY_TAG_GROUPS).map(([category, tags]) => ({
    label: formatMessage(`opportunities.tags.category.${category as OpportunityTagCategory}`),
    tone: CATEGORY_TONE[category as OpportunityTagCategory],
    options: tags.map((tag) => ({ value: tag, label: getOpportunityTagLabel(tag, formatMessage) })),
  }));
}
