import { describe, expect, it } from 'vitest';
import { getOpportunityErrorMessage } from './helpers';

describe('getOpportunityErrorMessage', () => {
  it.each([
    [
      'opportunities.errors.phoneUnavailable (HTTP 409)',
      'translated:opportunities.errors.phoneUnavailable',
    ],
    [
      'opportunities.errors.phoneAlreadySet (HTTP 409)',
      'translated:opportunities.errors.phoneAlreadySet',
    ],
    [
      'opportunities.errors.changesRequired (HTTP 400)',
      'translated:opportunities.errors.changesRequired',
    ],
  ])(
    'should translate the domain error %s without exposing transport suffixes',
    (message, expected) => {
      const formatMessage = (key: string) => `translated:${key}`;

      expect(getOpportunityErrorMessage(new Error(message), formatMessage, 'fallback')).toBe(
        expected,
      );
    },
  );

  it('should keep ordinary server errors and use the provided fallback for unknown errors', () => {
    const formatMessage = (key: string) => `translated:${key}`;

    expect(
      getOpportunityErrorMessage(new Error('Server unavailable'), formatMessage, 'fallback'),
    ).toBe('Server unavailable');
    expect(getOpportunityErrorMessage(null, formatMessage, 'fallback')).toBe('fallback');
  });
});
