import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityApplication } from '@core/types/opportunities';
import { ApplicantsModal, type ApplicantsModalProps } from './ApplicantsModal';

const mockApplications: OpportunityApplication[] = [
  {
    id: 'app-1',
    applicantName: 'Олена Коваль',
    contactInfo: '@olena_tg',
    motivation: 'Маю досвід у React та TypeScript, хочу приєднатися до проєкту.',
    status: 'SUBMITTED',
    opportunityId: 'opp-1',
    applicantId: 'user-1',
    applicant: {
      name: 'Олена Коваль',
      email: 'olena@karazin.ua',
    },
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'app-2',
    applicantName: 'Іван Петренко',
    contactInfo: '+380501234567',
    motivation: 'Цікавлюсь backend розробкою.',
    status: 'UNDER_REVIEW',
    opportunityId: 'opp-1',
    applicantId: 'user-2',
    applicant: {
      name: 'Іван Петренко',
      email: 'ivan@karazin.ua',
    },
    createdAt: '2026-10-11T12:00:00.000Z',
    updatedAt: '2026-10-11T12:00:00.000Z',
  },
];

const renderApplicantsModal = (props?: Partial<ApplicantsModalProps>) => {
  const defaultProps: ApplicantsModalProps = {
    open: true,
    onClose: vi.fn(),
    applications: mockApplications,
    loading: false,
    isError: false,
    onRetry: vi.fn(),
    onUpdateStatus: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <LanguageProvider>
        <ApplicantsModal {...defaultProps} />
      </LanguageProvider>,
    ),
    props: defaultProps,
  };
};

describe('ApplicantsModal component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render applicants modal when open with applicant details and status', () => {
    renderApplicantsModal();

    expect(screen.getByRole('dialog', { name: 'Кандидати на можливість (2)' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Кандидати на можливість (2)' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Олена Коваль')).toBeInTheDocument();
    expect(screen.getByText('olena@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('@olena_tg')).toBeInTheDocument();
    expect(screen.getByText('Надіслано')).toBeInTheDocument();
    expect(screen.getAllByText('Супровідне повідомлення:')).toHaveLength(2);
    expect(
      screen.getByText('Маю досвід у React та TypeScript, хочу приєднатися до проєкту.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/10 жовт/i)).toBeInTheDocument();

    expect(screen.getByText('Іван Петренко')).toBeInTheDocument();
    expect(screen.getByText('ivan@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('На розгляді')).toBeInTheDocument();
    expect(screen.getByText('Цікавлюсь backend розробкою.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Закрити' })).toBeInTheDocument();
  });

  it("should call onUpdateStatus with 'ACCEPTED' when clicking Accept button", async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();

    renderApplicantsModal({ onUpdateStatus });

    const acceptButtons = screen.getAllByRole('button', { name: 'Прийняти' });

    expect(acceptButtons.length).toBeGreaterThan(0);

    await user.click(acceptButtons[0]);

    expect(onUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).toHaveBeenCalledWith('app-1', 'ACCEPTED');
  });

  it("should call onUpdateStatus with 'REJECTED' when clicking Reject button", async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();

    renderApplicantsModal({ onUpdateStatus });

    const rejectButtons = screen.getAllByRole('button', { name: 'Відхилити' });

    expect(rejectButtons.length).toBeGreaterThan(0);

    await user.click(rejectButtons[0]);

    expect(onUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).toHaveBeenCalledWith('app-1', 'REJECTED');
  });

  it("should call onUpdateStatus with 'UNDER_REVIEW' when clicking Under Review button", async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();

    renderApplicantsModal({ onUpdateStatus });

    const underReviewButtons = screen.getAllByRole('button', { name: 'На розгляд' });

    expect(underReviewButtons.length).toBe(1);

    await user.click(underReviewButtons[0]);

    expect(onUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).toHaveBeenCalledWith('app-1', 'UNDER_REVIEW');
  });

  it('should render empty state when applications array is empty', () => {
    renderApplicantsModal({ applications: [] });

    expect(screen.getByRole('dialog', { name: 'Кандидати на можливість (0)' })).toBeInTheDocument();
    expect(screen.getByText('На цю можливість ще немає відгуків')).toBeInTheDocument();
    expect(screen.queryByText('Олена Коваль')).not.toBeInTheDocument();
  });

  it('should render loading spinner when loading is true', () => {
    renderApplicantsModal({ loading: true });

    expect(screen.getByRole('status', { name: 'Завантаження...' })).toBeInTheDocument();
    expect(screen.queryByText('Олена Коваль')).not.toBeInTheDocument();
    expect(screen.queryByText('На цю можливість ще немає відгуків')).not.toBeInTheDocument();
  });

  it('should call onClose when closing the modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderApplicantsModal({ onClose });

    const closeBtn = screen.getByRole('button', { name: 'Закрити' });

    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking header close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = renderApplicantsModal({ onClose });

    const headerCloseBtn = container.querySelector('button[class*="closeBtn"]');

    expect(headerCloseBtn).not.toBeNull();

    if (headerCloseBtn) {
      await user.click(headerCloseBtn);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not render modal when open is false', () => {
    renderApplicantsModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render fallback values when applicant name and motivation are missing', () => {
    const minimalApplication: OpportunityApplication[] = [
      {
        id: 'app-fallback',
        applicantName: '',
        contactInfo: 'anonymous@karazin.ua',
        motivation: null,
        status: 'ACCEPTED',
        opportunityId: 'opp-1',
        applicantId: 'user-3',
        createdAt: '2026-10-12T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
      },
    ];

    renderApplicantsModal({ applications: minimalApplication });

    expect(screen.getByText('Студент')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('anonymous@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('Прийнято')).toBeInTheDocument();
    expect(screen.queryByText('Супровідне повідомлення:')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Прийняти' })).not.toBeInTheDocument();
  });
});
