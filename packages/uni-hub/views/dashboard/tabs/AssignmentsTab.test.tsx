import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Assignment } from '@uni-hub/types';
import type { AssignmentsTabProps } from '../types';
import { AssignmentsTab } from './AssignmentsTab';

vi.mock('@uni-hub/services/api', () => ({
  moodleApi: {
    getAssignmentStatus: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@uni-hub/utils/soundEffects', () => ({
  playClick: vi.fn(),
}));

const mockAssignment1: Assignment = {
  id: 1,
  courseName: 'Математичний аналіз',
  name: 'Лабораторна робота №1',
  duedate: 1735689600,
  description: 'Опис першої лабораторної роботи',
  submissionStatus: 'new',
};

const mockAssignment2: Assignment = {
  id: 2,
  courseName: 'Дискретна математика',
  name: 'Домашнє завдання №2',
  duedate: 1735776000,
  description: 'Опис другого завдання',
  submissionStatus: 'submitted',
};

const createDefaultProps = (overrides?: Partial<AssignmentsTabProps>): AssignmentsTabProps => {
  return {
    assignments: [mockAssignment1, mockAssignment2],
    dateFrom: '',
    dateTo: '',
    onDateFromChange: vi.fn(),
    onDateToChange: vi.fn(),
    sortOrder: 'asc',
    onSortOrderChange: vi.fn(),
    hideCompleted: false,
    onHideCompletedChange: vi.fn(),
    soundEnabled: true,
    onOpenAssignment: vi.fn(),
    ...overrides,
  };
};

const renderAssignmentsTab = (props: AssignmentsTabProps) => {
  return render(
    <LanguageProvider>
      <AssignmentsTab {...props} />
    </LanguageProvider>,
  );
};

describe('AssignmentsTab component', () => {
  it('should render assignments list and toggle filter panel on filter button click', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();

    renderAssignmentsTab(props);

    expect(screen.getByText('Лабораторна робота №1')).toBeInTheDocument();
    expect(screen.getByText('Домашнє завдання №2')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: /фільтри/i });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /сховати фільтри/i })).toBeInTheDocument();

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /фільтри/i })).toBeInTheDocument();
  });

  it('should toggle hideCompleted checkbox and trigger onHideCompletedChange', async () => {
    const user = userEvent.setup();
    const onHideCompletedChange = vi.fn();
    const props = createDefaultProps({
      hideCompleted: false,
      onHideCompletedChange,
    });

    const { rerender } = renderAssignmentsTab(props);
    const checkbox = screen.getByRole('checkbox', { name: /сховати виконані/i });

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Домашнє завдання №2')).toBeInTheDocument();

    await user.click(checkbox);

    expect(onHideCompletedChange).toHaveBeenCalledTimes(1);
    expect(onHideCompletedChange).toHaveBeenCalledWith(true);

    rerender(
      <LanguageProvider>
        <AssignmentsTab {...props} hideCompleted={true} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Лабораторна робота №1')).toBeInTheDocument();
    expect(screen.queryByText('Домашнє завдання №2')).not.toBeInTheDocument();
  });

  it('should change sort order via select dropdown and trigger onSortOrderChange', async () => {
    const user = userEvent.setup();
    const onSortOrderChange = vi.fn();
    const props = createDefaultProps({
      sortOrder: 'asc',
      onSortOrderChange,
    });

    renderAssignmentsTab(props);

    const select = screen.getByRole('combobox');

    expect(select).toHaveValue('asc');

    await user.selectOptions(select, 'desc');

    expect(onSortOrderChange).toHaveBeenCalledTimes(1);
    expect(onSortOrderChange).toHaveBeenCalledWith('desc');
  });

  it('should trigger onOpenAssignment when assignment card is clicked', async () => {
    const user = userEvent.setup();
    const onOpenAssignment = vi.fn();
    const props = createDefaultProps({
      onOpenAssignment,
    });

    renderAssignmentsTab(props);

    const assignmentCard = screen.getByRole('button', { name: /лабораторна робота №1/i });

    await user.click(assignmentCard);

    expect(onOpenAssignment).toHaveBeenCalledTimes(1);
    expect(onOpenAssignment).toHaveBeenCalledWith(mockAssignment1);
  });

  it('should render empty state when no assignments exist', () => {
    const props = createDefaultProps({
      assignments: [],
    });

    renderAssignmentsTab(props);

    expect(screen.getByText('Завдань не знайдено')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /відкрити/i })).not.toBeInTheDocument();
  });
});
