import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Opportunity, OpportunityApplication } from '@uni-hub/types';
import { CatalogTab } from './CatalogTab';
import { MyOpportunitiesTab } from './MyOpportunitiesTab';
import { MyApplicationsTab } from './MyApplicationsTab';
import { ModerationQueueTab } from './ModerationQueueTab';
import { getStatusBadge, getApplicationStatusBadge } from './badges';

describe('Opportunities decomposed subtabs', () => {
  const mockOpportunity: Opportunity = {
    id: 'opp-1',
    title: 'Frontend Developer',
    description: 'React, TypeScript project',
    ownerContactInfo: 'hr@example.com',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '400$',
    ownerId: 'user-1',
    owner: {
      id: 'user-1',
      name: 'Owner Name',
      email: 'owner@example.com',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  const mockApplication: OpportunityApplication = {
    id: 'app-1',
    opportunityId: 'opp-1',
    applicantId: 'user-2',
    applicantName: 'Student Name',
    contactInfo: '@student_tg',
    motivation: 'I love React and want to learn more',
    status: 'SUBMITTED',
    createdAt: '2026-10-01T11:00:00.000Z',
    updatedAt: '2026-10-01T11:00:00.000Z',
    opportunity: mockOpportunity,
  };

  it('renders CatalogTab with search bar, filter chips, and card', () => {
    const html = renderToString(
      React.createElement(CatalogTab, {
        loading: false,
        opportunities: [mockOpportunity],
        search: '',
        onSearchChange: () => {},
        paymentFilter: '',
        onPaymentFilterChange: () => {},
        onOpenDetail: () => {},
      }),
    );

    expect(html).toContain('Пошук за назвою або ключовими словами...');
    expect(html).toContain('Оплачувані');
    expect(html).toContain('Волонтерство / Практика');
    expect(html).toContain('Frontend Developer');
  });

  it('renders MyOpportunitiesTab with owner cards', () => {
    const html = renderToString(
      React.createElement(MyOpportunitiesTab, {
        loading: false,
        myOpportunities: [mockOpportunity],
        onOpenApplicants: () => {},
        onOpenDetail: () => {},
      }),
    );

    expect(html).toContain('Frontend Developer');
    expect(html).toContain('Відгуки');
  });

  it('renders MyApplicationsTab with application details and withdraw button', () => {
    const html = renderToString(
      React.createElement(MyApplicationsTab, {
        loading: false,
        myApplications: [mockApplication],
        onWithdraw: () => {},
      }),
    );

    expect(html).toContain('Frontend Developer');
    expect(html).toContain('I love React and want to learn more');
    expect(html).toContain('Відкликати відгук');
  });

  it('renders ModerationQueueTab with moderation actions', () => {
    const html = renderToString(
      React.createElement(ModerationQueueTab, {
        loading: false,
        moderationQueue: [mockOpportunity],
        onModerate: () => {},
        onOpenRejectModal: () => {},
      }),
    );

    expect(html).toContain('Frontend Developer');
    expect(html).toContain('Схвалити');
    expect(html).toContain('На доопрацювання');
    expect(html).toContain('Відхилити');
  });

  it('renders badges correctly', () => {
    const draftBadge = renderToString(getStatusBadge('DRAFT'));

    expect(draftBadge).toContain('Чернетка');

    const appBadge = renderToString(getApplicationStatusBadge('ACCEPTED'));

    expect(appBadge).toContain('Прийнято');
  });
});
