import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentsEmptyState } from './AssignmentsEmptyState';

describe('AssignmentsEmptyState', () => {
  it('should render default empty state when there are no assignments', () => {
    render(<AssignmentsEmptyState hasAssignments={false} hasDateFilter={false} />);

    expect(screen.getByText('Завдань не знайдено')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
  });

  it('should render filtered empty state when date filter is active', () => {
    render(<AssignmentsEmptyState hasAssignments={true} hasDateFilter={true} />);

    expect(screen.getByText('За обраними датами завдань не знайдено')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should render all-completed celebratory state when assignments exist but none are pending and no date filter', () => {
    render(<AssignmentsEmptyState hasAssignments={true} hasDateFilter={false} />);

    expect(screen.getByText(/Ура, всі завдання виконані!/i)).toBeInTheDocument();
    expect(screen.getByText('🏖️')).toBeInTheDocument();
  });
});
