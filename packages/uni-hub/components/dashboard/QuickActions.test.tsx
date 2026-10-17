import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Assignment } from '@uni-hub/types';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { QuickActions } from './QuickActions';

vi.mock('./DeanContactModal', () => ({
  DeanContactModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const title = "Зв'язок з деканатом";

    return open ? (
      <dialog open aria-label={title}>
        <h2>{title}</h2>
        <button type="button" aria-label="Закрити" onClick={onClose}>
          Закрити
        </button>
      </dialog>
    ) : null;
  },
}));

const mockPendingAssignments: Assignment[] = [
  {
    id: 1,
    name: 'Лабораторна робота 1',
    courseName: 'Алгоритми та структури даних',
    duedate: 1730000000,
    description: 'Опис завдання 1',
    submissionStatus: 'not_submitted',
    grade: null,
    graded: false,
  },
  {
    id: 2,
    name: 'Практична робота 2',
    courseName: 'Бази даних',
    duedate: 1730100000,
    description: 'Опис завдання 2',
    submissionStatus: 'draft',
    grade: null,
    graded: false,
  },
  {
    id: 3,
    name: 'Тест 1',
    courseName: 'Операційні системи',
    duedate: 1730200000,
    description: 'Опис завдання 3',
    submissionStatus: 'submitted',
    grade: null,
    graded: false,
  },
];

const mockCompletedAssignments: Assignment[] = [
  {
    id: 3,
    name: 'Тест 1',
    courseName: 'Операційні системи',
    duedate: 1730200000,
    description: 'Опис завдання 3',
    submissionStatus: 'submitted',
    grade: null,
    graded: false,
  },
];

const renderQuickActions = (props: Partial<React.ComponentProps<typeof QuickActions>> = {}) => {
  const defaultProps: React.ComponentProps<typeof QuickActions> = {
    assignments: [],
    onNavigate: vi.fn(),
  };
  const mergedProps = { ...defaultProps, ...props };

  return render(
    <FeatureToggleProvider>
      <LanguageProvider>
        <QuickActions {...mergedProps} />
      </LanguageProvider>
    </FeatureToggleProvider>,
  );
};

describe('QuickActions component', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';
    process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES = 'true';
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
    window.localStorage.clear();
  });

  it('should render quick actions container with accessible heading and action cards', () => {
    renderQuickActions();

    const section = screen.getByRole('region', { name: 'Швидкі дії' });
    const heading = screen.getByRole('heading', { level: 3, name: 'Швидкі дії' });

    expect(section).toBeInTheDocument();
    expect(heading).toBeInTheDocument();

    const moodleLink = screen.getByRole('link', { name: /Moodle LMS/i });
    const assignmentsCard = screen.getByRole('button', { name: /Мої завдання/i });
    const scheduleCard = screen.getByRole('button', { name: /Розклад занять/i });
    const deanCard = screen.getByRole('button', { name: /Зв'язок з деканатом/i });
    const opportunitiesCard = screen.getByRole('button', { name: /Можливості/i });

    expect(moodleLink).toBeInTheDocument();
    expect(moodleLink).toHaveAttribute('href', 'https://moodle.universemvp.tech');
    expect(moodleLink).toHaveAttribute('target', '_blank');
    expect(assignmentsCard).toBeInTheDocument();
    expect(scheduleCard).toBeInTheDocument();
    expect(deanCard).toBeInTheDocument();
    expect(opportunitiesCard).toBeInTheDocument();
  });

  it('should navigate to assignments when assignments card is clicked', async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderQuickActions({ onNavigate: handleNavigate });

    const assignmentsCard = screen.getByRole('button', { name: /Мої завдання/i });

    await user.click(assignmentsCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('assignments');
  });

  it('should navigate to schedule when schedule card is clicked', async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderQuickActions({ onNavigate: handleNavigate });

    const scheduleCard = screen.getByRole('button', { name: /Розклад занять/i });

    await user.click(scheduleCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('schedule');
  });

  it('should navigate to opportunities when opportunities card is clicked', async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderQuickActions({ onNavigate: handleNavigate });

    const opportunitiesCard = screen.getByRole('button', { name: /Можливості/i });

    await user.click(opportunitiesCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('opportunities');
  });

  it('should open dean contact modal when dean card is clicked and close it on dismiss', async () => {
    const user = userEvent.setup();

    renderQuickActions();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const deanCard = screen.getByRole('button', { name: /Зв'язок з деканатом/i });

    await user.click(deanCard);

    const dialog = screen.getByRole('dialog', { name: "Зв'язок з деканатом" });

    expect(dialog).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Закрити' });

    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display pending assignments badge count when assignments are pending', () => {
    const { rerender } = renderQuickActions({ assignments: mockPendingAssignments });

    const pendingBadge = screen.getByText('2');
    const pendingDescription = screen.getByText('2 до виконання');

    expect(pendingBadge).toBeInTheDocument();
    expect(pendingDescription).toBeInTheDocument();

    rerender(
      <FeatureToggleProvider>
        <LanguageProvider>
          <QuickActions assignments={mockCompletedAssignments} onNavigate={vi.fn()} />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.getByText('Всі завдання здано')).toBeInTheDocument();
  });
});
