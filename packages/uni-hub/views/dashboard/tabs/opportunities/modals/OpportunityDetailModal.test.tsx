import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { OpportunityDetailModal, type OpportunityDetailModalProps } from './OpportunityDetailModal';

describe('OpportunityDetailModal component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
    vi.clearAllMocks();
  });

  const mockOpportunity: Opportunity = {
    id: 'opp-1',
    title: 'Frontend Developer Internship',
    description: 'We are looking for a motivated student to work on modern React applications.',
    ownerContactInfo: 'lead@karazin.ua',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500 USD / month',
    ownerId: 'owner-1',
    owner: {
      id: 'owner-1',
      name: 'Каразінський хаб інновацій',
      email: 'hub@karazin.ua',
    },
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
    acceptsApplications: true,
  };

  const defaultProps: OpportunityDetailModalProps = {
    open: true,
    onClose: vi.fn(),
    opportunity: mockOpportunity,
    userId: 'user-guest',
    onSendToReview: vi.fn(),
    onLifecycleChange: vi.fn(),
    onOpenApply: vi.fn(),
    onEdit: vi.fn(),
  };

  const renderModal = (props: Partial<OpportunityDetailModalProps> = {}) => {
    return render(
      <LanguageProvider>
        <OpportunityDetailModal {...defaultProps} {...props} />
      </LanguageProvider>,
    );
  };

  it('should return null when opportunity is null', () => {
    const { container } = renderModal({ opportunity: null });

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    renderModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render opportunity details (title, description, tags, contacts) when open', () => {
    renderModal();

    const formattedDate = new Date(mockOpportunity.createdAt).toLocaleDateString('uk-UA');

    expect(screen.getByRole('dialog', { name: mockOpportunity.title })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: mockOpportunity.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(mockOpportunity.title)).toBeInTheDocument();
    expect(screen.getByText(mockOpportunity.description)).toBeInTheDocument();
    expect(screen.getByText('Опис проекту та вимоги')).toBeInTheDocument();
    expect(screen.getByText('Оплата: 500 USD / month')).toBeInTheDocument();
    expect(screen.getByText('Опубліковано')).toBeInTheDocument();
    expect(screen.getByText('Фаза: Активна фаза')).toBeInTheDocument();
    expect(screen.getByText('Організатор:')).toBeInTheDocument();
    expect(screen.getByText('Каразінський хаб інновацій')).toBeInTheDocument();
    expect(screen.getByText(`Опубліковано: ${formattedDate}`)).toBeInTheDocument();
    expect(screen.getByText('Контакти для звʼязку:')).toBeInTheDocument();
    expect(screen.getByText(mockOpportunity.ownerContactInfo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Закрити' })).toBeInTheDocument();
  });

  it('should render unpaid label when opportunity paymentType is UNPAID', () => {
    renderModal({
      opportunity: {
        ...mockOpportunity,
        paymentType: 'UNPAID',
        paymentDetails: null,
      },
    });

    expect(screen.getByText('Без оплати (Практика / Досвід)')).toBeInTheDocument();
  });

  it('should render fallback organizer name when owner details are missing', () => {
    renderModal({
      opportunity: {
        ...mockOpportunity,
        owner: undefined,
      },
    });

    expect(screen.getByText('Каразінський університет')).toBeInTheDocument();
  });

  it('should render owner action buttons (send to review, edit) when userId matches ownerId', () => {
    renderModal({
      userId: 'owner-1',
      opportunity: {
        ...mockOpportunity,
        ownerId: 'owner-1',
        status: 'DRAFT',
      },
    });

    expect(screen.getByRole('button', { name: 'Редагувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Надіслати на модерацію' })).toBeInTheDocument();
    expect(screen.getByText('Керування вашою можливістю')).toBeInTheDocument();
    expect(screen.getByLabelText('Фаза:')).toBeInTheDocument();
  });

  it('should trigger onEdit when edit button is clicked by owner', async () => {
    const handleEdit = vi.fn();
    const user = userEvent.setup();
    const draftOpportunity: Opportunity = {
      ...mockOpportunity,
      ownerId: 'owner-1',
      status: 'DRAFT',
    };

    renderModal({
      userId: 'owner-1',
      opportunity: draftOpportunity,
      onEdit: handleEdit,
    });

    const editBtn = screen.getByRole('button', { name: 'Редагувати' });

    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(draftOpportunity);
  });

  it('should trigger onSendToReview when send to review button is clicked by owner', async () => {
    const handleSendToReview = vi.fn();
    const user = userEvent.setup();
    const draftOpportunity: Opportunity = {
      ...mockOpportunity,
      ownerId: 'owner-1',
      status: 'DRAFT',
    };

    renderModal({
      userId: 'owner-1',
      opportunity: draftOpportunity,
      onSendToReview: handleSendToReview,
    });

    const sendToReviewBtn = screen.getByRole('button', { name: 'Надіслати на модерацію' });

    await user.click(sendToReviewBtn);

    expect(handleSendToReview).toHaveBeenCalledTimes(1);
    expect(handleSendToReview).toHaveBeenCalledWith(draftOpportunity.id);
  });

  it('should trigger onLifecycleChange when owner changes lifecycle select', async () => {
    const handleLifecycleChange = vi.fn();
    const user = userEvent.setup();

    renderModal({
      userId: 'owner-1',
      opportunity: {
        ...mockOpportunity,
        ownerId: 'owner-1',
      },
      onLifecycleChange: handleLifecycleChange,
    });

    const phaseSelect = screen.getByLabelText('Фаза:');

    await user.selectOptions(phaseSelect, 'PAUSED');

    expect(handleLifecycleChange).toHaveBeenCalledTimes(1);
    expect(handleLifecycleChange).toHaveBeenCalledWith(mockOpportunity.id, 'PAUSED');
  });

  it('should render Apply button and call onOpenApply when viewed by non-owner on published opportunity', async () => {
    const handleOpenApply = vi.fn();
    const user = userEvent.setup();

    renderModal({
      userId: 'user-guest',
      onOpenApply: handleOpenApply,
    });

    const applyButton = screen.getByRole('button', { name: 'Відгукнутися на можливість' });

    expect(applyButton).toBeInTheDocument();

    await user.click(applyButton);

    expect(handleOpenApply).toHaveBeenCalledTimes(1);
  });

  it('should not render Apply button when viewed by owner', () => {
    renderModal({
      userId: 'owner-1',
      opportunity: {
        ...mockOpportunity,
        ownerId: 'owner-1',
      },
    });

    expect(
      screen.queryByRole('button', { name: 'Відгукнутися на можливість' }),
    ).not.toBeInTheDocument();
  });

  it('should not render Apply button when opportunity does not accept applications', () => {
    renderModal({
      userId: 'user-guest',
      opportunity: {
        ...mockOpportunity,
        acceptsApplications: false,
      },
    });

    expect(
      screen.queryByRole('button', { name: 'Відгукнутися на можливість' }),
    ).not.toBeInTheDocument();
  });

  it('should render moderation comment for owner when present', () => {
    renderModal({
      userId: 'owner-1',
      opportunity: {
        ...mockOpportunity,
        ownerId: 'owner-1',
        status: 'REQUIRES_CHANGES',
        moderationComment: 'Будь ласка, детальніше опишіть графік роботи.',
      },
    });

    expect(screen.getByText('Зауваження модератора')).toBeInTheDocument();
    expect(screen.getByText('Будь ласка, детальніше опишіть графік роботи.')).toBeInTheDocument();
  });

  it('should not render moderation comment for non-owner', () => {
    renderModal({
      userId: 'user-guest',
      opportunity: {
        ...mockOpportunity,
        moderationComment: 'Секретний коментар модератора',
      },
    });

    expect(screen.queryByText('Зауваження модератора')).not.toBeInTheDocument();
    expect(screen.queryByText('Секретний коментар модератора')).not.toBeInTheDocument();
  });

  it('should call onClose when closing the modal', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderModal({
      onClose: handleClose,
    });

    const closeButton = screen.getByRole('button', { name: 'Закрити' });

    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
