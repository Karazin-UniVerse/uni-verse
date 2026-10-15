import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Opportunity } from '@uni-hub/types';
import { OpportunityCard } from './OpportunityCard';

describe('OpportunityCard component', () => {
  const mockOpportunity: Opportunity = {
    id: 'opp-1',
    title: 'Frontend Developer for Edu Startup',
    description: 'Looking for a passionate React developer',
    ownerContactInfo: 'hr@startup.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500$ / міс',
    ownerId: 'user-1',
    owner: {
      id: 'user-1',
      name: 'Startup Inc',
      email: 'team@startup.ua',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  it('renders catalog card with title, description, and compensation details', () => {
    const html = renderToString(
      React.createElement(OpportunityCard, {
        opportunity: mockOpportunity,
      }),
    );

    expect(html).toContain('Frontend Developer for Edu Startup');
    expect(html).toContain('Looking for a passionate React developer');
    expect(html).toContain('500$ / міс');
    expect(html).toContain('Вакансія');
    expect(html).toContain('Startup Inc');
    expect(html).toContain('hr@startup.ua');
  });

  it('renders practice badge for unpaid opportunities', () => {
    const unpaidOpp: Opportunity = {
      ...mockOpportunity,
      paymentType: 'UNPAID',
      paymentDetails: null,
    };

    const html = renderToString(
      React.createElement(OpportunityCard, {
        opportunity: unpaidOpp,
      }),
    );

    expect(html).toContain('Практика');
    expect(html).toContain('Досвід / Практика');
  });

  it('renders owner variant with management action buttons', () => {
    const html = renderToString(
      React.createElement(OpportunityCard, {
        opportunity: mockOpportunity,
        variant: 'owner',
        statusBadge: React.createElement('span', null, 'Опубліковано'),
      }),
    );

    expect(html).toContain('Опубліковано');
    expect(html).toContain('Відгуки');
    expect(html).toContain('Управління');
  });
});
