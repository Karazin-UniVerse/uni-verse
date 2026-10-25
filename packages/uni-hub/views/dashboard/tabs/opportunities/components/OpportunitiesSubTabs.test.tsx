import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import { CatalogTab } from './CatalogTab';
import { MyOpportunitiesTab } from './MyOpportunitiesTab';
import { MyApplicationsTab } from './MyApplicationsTab';
import { ModerationQueueTab } from './ModerationQueueTab';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { noop } from '@core/utils/fn';

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

  it('should render CatalogTab with search bar, filter chips, and card', () => {
    render(
      <LanguageProvider>
        <CatalogTab
          loading={false}
          isError={false}
          onRetry={noop}
          opportunities={[mockOpportunity]}
          search=""
          onSearchChange={noop}
          paymentFilter=""
          onPaymentFilterChange={noop}
          onOpenDetail={noop}
        />
      </LanguageProvider>,
    );

    expect(
      screen.getByPlaceholderText('Пошук за назвою або ключовими словами...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Оплачувані')).toBeInTheDocument();
    expect(screen.getByText('Волонтерство / Практика')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('should render MyOpportunitiesTab with owner cards', () => {
    render(
      <LanguageProvider>
        <MyOpportunitiesTab
          loading={false}
          isError={false}
          onRetry={noop}
          myOpportunities={[mockOpportunity]}
          onOpenApplicants={noop}
          onOpenDetail={noop}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /відгуки/i })).toBeInTheDocument();
  });

  it('should render MyApplicationsTab with application details and withdraw button', () => {
    render(
      <LanguageProvider>
        <MyApplicationsTab
          loading={false}
          isError={false}
          onRetry={noop}
          myApplications={[mockApplication]}
          onWithdraw={noop}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('I love React and want to learn more')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /відкликати відгук/i })).toBeInTheDocument();
  });

  it('should render ModerationQueueTab with moderation actions', () => {
    render(
      <LanguageProvider>
        <ModerationQueueTab
          currentUserId="other-moderator"
          loading={false}
          isError={false}
          onRetry={noop}
          moderationQueue={[mockOpportunity]}
          onModerate={noop}
          onOpenRejectModal={noop}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /схвалити/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /на доопрацювання/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /відхилити/i })).toBeEnabled();
  });

  it('keeps own opportunities visible but disables every moderation action', () => {
    render(
      <LanguageProvider>
        <ModerationQueueTab
          currentUserId="user-1"
          loading={false}
          isError={false}
          onRetry={noop}
          moderationQueue={[mockOpportunity]}
          onModerate={noop}
          onOpenRejectModal={noop}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /схвалити/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /на доопрацювання/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /відхилити/i })).toBeDisabled();
    expect(screen.getByText('Ви не можете модерувати власну можливість.')).toBeInTheDocument();
  });

  it('should render badges correctly', () => {
    const { rerender } = render(
      <LanguageProvider>
        <OpportunityStatusBadge status="DRAFT" />
      </LanguageProvider>,
    );

    expect(screen.getByText('Чернетка')).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <ApplicationStatusBadge status="ACCEPTED" />
      </LanguageProvider>,
    );
    expect(screen.getByText('Прийнято')).toBeInTheDocument();
  });
});
