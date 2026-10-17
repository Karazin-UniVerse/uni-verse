import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { ModerationQueueTab, type ModerationQueueTabProps } from './ModerationQueueTab';

const mockOpportunity: Opportunity = {
  id: 'opp-12345678',
  title: 'Full Stack Engineer',
  description: 'Building modern web applications with React and Node.js.',
  ownerContactInfo: 'lead@example.com',
  status: 'READY_FOR_REVIEW',
  lifecycleState: 'ACTIVE',
  paymentType: 'PAID',
  paymentDetails: '500$/month',
  ownerId: 'user-42',
  owner: {
    id: 'user-42',
    name: 'Jane Doe',
    email: 'jane@example.com',
  },
  createdAt: '2026-10-15T12:00:00.000Z',
  updatedAt: '2026-10-15T12:00:00.000Z',
  moderationComment: 'Please specify the expected working hours.',
};

const renderModerationQueueTab = (props: Partial<ModerationQueueTabProps> = {}) => {
  const defaultProps: ModerationQueueTabProps = {
    loading: false,
    moderationQueue: [mockOpportunity],
    onModerate: vi.fn(),
    onOpenRejectModal: vi.fn(),
  };

  return render(
    <LanguageProvider>
      <ModerationQueueTab {...defaultProps} {...props} />
    </LanguageProvider>,
  );
};

describe('ModerationQueueTab component', () => {
  it('should render moderation card details including title, category, payment type, and owner contacts', () => {
    renderModerationQueueTab();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Full Stack Engineer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Потребує модерації')).toBeInTheDocument();
    expect(screen.getByText(/Подано/i)).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('lead@example.com')).toBeInTheDocument();
    expect(screen.getByText('Оплачувана (500$/month)')).toBeInTheDocument();
    expect(screen.getByText('Опис пропозиції')).toBeInTheDocument();
    expect(
      screen.getByText('Building modern web applications with React and Node.js.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Попередній коментар модерації:/i)).toBeInTheDocument();
    expect(screen.getByText('Please specify the expected working hours.')).toBeInTheDocument();
    expect(screen.getByText('opp-1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /схвалити/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /на доопрацювання/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /відхилити/i })).toBeInTheDocument();
  });

  it("should call onModerate with 'approve' when clicking Approve button", async () => {
    const user = userEvent.setup();
    const onModerate = vi.fn();

    renderModerationQueueTab({ onModerate });

    await user.click(screen.getByRole('button', { name: /схвалити/i }));

    expect(onModerate).toHaveBeenCalledTimes(1);
    expect(onModerate).toHaveBeenCalledWith(mockOpportunity.id, 'APPROVE');
  });

  it('should call onOpenRejectModal and not onModerate when clicking Request Changes button', async () => {
    const user = userEvent.setup();
    const onModerate = vi.fn();
    const onOpenRejectModal = vi.fn();

    renderModerationQueueTab({ onModerate, onOpenRejectModal });

    await user.click(screen.getByRole('button', { name: /на доопрацювання/i }));

    expect(onOpenRejectModal).toHaveBeenCalledTimes(1);
    expect(onOpenRejectModal).toHaveBeenCalledWith(mockOpportunity.id);
    expect(onModerate).not.toHaveBeenCalled();
  });

  it('should call onOpenRejectModal when clicking Reject button', async () => {
    const user = userEvent.setup();
    const onOpenRejectModal = vi.fn();

    renderModerationQueueTab({ onOpenRejectModal });

    await user.click(screen.getByRole('button', { name: /відхилити/i }));

    expect(onOpenRejectModal).toHaveBeenCalledTimes(1);
    expect(onOpenRejectModal).toHaveBeenCalledWith(mockOpportunity.id);
  });

  it('should render empty state when moderationQueue is empty', () => {
    renderModerationQueueTab({ moderationQueue: [] });

    expect(
      screen.getByText('Черга модерації порожня! Немає нових можливостей для перевірки.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('should render loading state when loading is true', () => {
    renderModerationQueueTab({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Full Stack Engineer')).not.toBeInTheDocument();
  });

  it('should render practice pill when payment type is unpaid', () => {
    const unpaidOpportunity: Opportunity = {
      ...mockOpportunity,
      paymentType: 'UNPAID',
      paymentDetails: undefined,
    };

    renderModerationQueueTab({ moderationQueue: [unpaidOpportunity] });

    expect(screen.getByText('Практика')).toBeInTheDocument();
    expect(screen.queryByText(/Оплачувана/i)).not.toBeInTheDocument();
  });

  it('should render paid pill without details when paymentDetails is absent', () => {
    const paidWithoutDetailsOpportunity: Opportunity = {
      ...mockOpportunity,
      paymentType: 'PAID',
      paymentDetails: undefined,
    };

    renderModerationQueueTab({ moderationQueue: [paidWithoutDetailsOpportunity] });

    expect(screen.getByText('Оплачувана')).toBeInTheDocument();
  });

  it('should render fallback owner name and initial when owner is absent', () => {
    const opportunityWithoutOwner: Opportunity = {
      ...mockOpportunity,
      owner: undefined,
      ownerContactInfo: '',
    };

    renderModerationQueueTab({ moderationQueue: [opportunityWithoutOwner] });

    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('Невідомо')).toBeInTheDocument();
    expect(screen.queryByText('lead@example.com')).not.toBeInTheDocument();
  });

  it('should not render previous comment section when moderationComment is absent', () => {
    const opportunityWithoutComment: Opportunity = {
      ...mockOpportunity,
      moderationComment: undefined,
    };

    renderModerationQueueTab({ moderationQueue: [opportunityWithoutComment] });

    expect(screen.queryByText(/Попередній коментар модерації:/i)).not.toBeInTheDocument();
  });
});
