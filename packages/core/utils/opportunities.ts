import type { UnavailableOpportunity } from '../types/opportunities.ts';

export function isUnavailableOpportunity(
  opportunity: object,
): opportunity is UnavailableOpportunity {
  return 'availability' in opportunity;
}
