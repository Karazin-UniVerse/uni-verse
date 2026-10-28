import { describe, expect, it } from 'vitest';
import type { Opportunity } from '@core/types/opportunities';
import {
  calculatePaymentCounts,
  filterOpportunitiesByPayment,
  filterOpportunitiesBySearch,
  getOpportunityErrorMessage,
} from './helpers';

const sampleOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Frontend Developer',
    description: 'React, TypeScript project for students',
    ownerContactInfo: 'hr@frontend.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '400$ / month',
    ownerId: 'user-1',
    owner: {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@frontend.ua',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'opp-2',
    title: 'Backend Engineer',
    description: 'Node.js and PostgreSQL backend services',
    ownerContactInfo: 'lead@backend.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'UNPAID',
    paymentDetails: null,
    ownerId: 'user-2',
    owner: {
      id: 'user-2',
      name: 'Bob Smith',
      email: 'bob@backend.ua',
    },
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'opp-3',
    title: 'UI/UX Designer',
    description: 'Figma and Design Systems workshop',
    ownerContactInfo: 'design-lead@kpi.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '600$ / month',
    ownerId: 'user-3',
    owner: {
      id: 'user-3',
      name: 'Charlie Brown',
      email: 'charlie@kpi.ua',
    },
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
  },
];

describe('getOpportunityErrorMessage', () => {
  it.each([
    [
      'opportunities.errors.alreadyApplied (HTTP 409)',
      'translated:opportunities.errors.alreadyApplied',
    ],
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

describe('filterOpportunitiesBySearch', () => {
  it('should return all opportunities when search query is empty or whitespace', () => {
    expect(filterOpportunitiesBySearch(sampleOpportunities, '')).toEqual(sampleOpportunities);
    expect(filterOpportunitiesBySearch(sampleOpportunities, '   ')).toEqual(sampleOpportunities);
  });

  it('should filter by title case-insensitively', () => {
    const result = filterOpportunitiesBySearch(sampleOpportunities, 'frontend');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('opp-1');
  });

  it('should filter by description', () => {
    const result = filterOpportunitiesBySearch(sampleOpportunities, 'PostgreSQL');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('opp-2');
  });

  it('should filter by owner name and email', () => {
    const byName = filterOpportunitiesBySearch(sampleOpportunities, 'Charlie');
    const byEmail = filterOpportunitiesBySearch(sampleOpportunities, 'alice@frontend.ua');

    expect(byName).toHaveLength(1);
    expect(byName[0]?.id).toBe('opp-3');
    expect(byEmail).toHaveLength(1);
    expect(byEmail[0]?.id).toBe('opp-1');
  });

  it('should filter by ownerContactInfo', () => {
    const result = filterOpportunitiesBySearch(sampleOpportunities, 'design-lead');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('opp-3');
  });

  it('should return empty array when no opportunity matches', () => {
    const result = filterOpportunitiesBySearch(sampleOpportunities, 'nonexistentquery');

    expect(result).toHaveLength(0);
  });
});

describe('calculatePaymentCounts', () => {
  it('should calculate total, paid, and unpaid counts', () => {
    const counts = calculatePaymentCounts(sampleOpportunities);

    expect(counts).toEqual({
      all: 3,
      paid: 2,
      unpaid: 1,
    });
  });

  it('should return zeros for empty list', () => {
    const counts = calculatePaymentCounts([]);

    expect(counts).toEqual({
      all: 0,
      paid: 0,
      unpaid: 0,
    });
  });
});

describe('filterOpportunitiesByPayment', () => {
  it('should return all opportunities when filter is empty string', () => {
    expect(filterOpportunitiesByPayment(sampleOpportunities, '')).toEqual(sampleOpportunities);
  });

  it('should filter paid opportunities', () => {
    const result = filterOpportunitiesByPayment(sampleOpportunities, 'PAID');

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.id)).toEqual(['opp-1', 'opp-3']);
  });

  it('should filter unpaid opportunities', () => {
    const result = filterOpportunitiesByPayment(sampleOpportunities, 'UNPAID');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('opp-2');
  });
});
