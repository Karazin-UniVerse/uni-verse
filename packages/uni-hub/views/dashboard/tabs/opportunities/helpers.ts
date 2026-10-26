import { getErrorMessage } from '@uni-hub/services/api';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { OPPORTUNITY_ERROR } from '@core/constants/opportunities';

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
