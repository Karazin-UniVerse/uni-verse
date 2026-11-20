import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentsEmptyState } from './AssignmentsEmptyState';

describe('AssignmentsEmptyState', () => {
  it('should render default empty state when there are no assignments', () => {
    const { container } = render(
      <AssignmentsEmptyState hasAssignments={false} hasDateFilter={false} />,
    );

    expect(screen.getByText('Завдань не знайдено')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render filtered empty state when date filter is active', () => {
    const { container } = render(
      <AssignmentsEmptyState hasAssignments={true} hasDateFilter={true} />,
    );

    expect(screen.getByText('За обраними датами завдань не знайдено')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render all-completed celebratory state when assignments exist but none are pending and no date filter', () => {
    const { container } = render(
      <AssignmentsEmptyState hasAssignments={true} hasDateFilter={false} />,
    );

    expect(screen.getByText(/Ура, всі завдання виконані!/i)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
