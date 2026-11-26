import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { OpportunityApplication } from '@core/types/opportunities';
import { MyApplicationCard } from './MyApplicationCard';

const LONG_DETAILS =
  '15 000 грн за кожен етап завершеної роботи, оплата протягом п’яти банківських днів після прийняття';

const buildApplication = (paymentDetails: string | null): OpportunityApplication => ({
  id: 'app-paid-12345678',
  applicantName: 'Test Applicant',
  contactInfo: 'applicant@example.com',
  motivation: null,
  status: 'ACCEPTED',
  ownerComment: null,
  opportunityId: 'opp-1',
  opportunity: {
    id: 'opp-1',
    title: 'Telegram bot developer',
    description: 'Backend role.',
    ownerContactInfo: 'mentor@example.com',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails,
    ownerId: 'owner-1',
    owner: { id: 'owner-1', name: 'Alice Johnson', email: 'alice@example.com' },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  applicantId: 'user-1',
  createdAt: '2026-10-10T12:00:00.000Z',
  updatedAt: '2026-10-10T12:00:00.000Z',
});

describe('MyApplicationCard paid pill', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('keeps the full long payment text in the DOM (truncation is visual only)', () => {
    render(
      withLanguage(
        <MyApplicationCard application={buildApplication(LONG_DETAILS)} onWithdraw={vi.fn()} />,
      ),
    );

    expect(screen.getByText(new RegExp(LONG_DETAILS, 'u'))).toBeInTheDocument();
  });

  it('shows the paid label without details when none are provided', () => {
    render(
      withLanguage(<MyApplicationCard application={buildApplication(null)} onWithdraw={vi.fn()} />),
    );

    expect(screen.queryByText(new RegExp(LONG_DETAILS, 'u'))).not.toBeInTheDocument();
  });
});
