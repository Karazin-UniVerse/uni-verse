import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AssignmentsEmptyState } from './AssignmentsEmptyState';

describe('AssignmentsEmptyState', () => {
  it('renders default empty state when there are no assignments', () => {
    const html = renderToString(
      React.createElement(AssignmentsEmptyState, {
        hasAssignments: false,
        hasDateFilter: false,
      }),
    );

    expect(html).toContain('Завдань не знайдено');
    expect(html).toContain('📝');
  });

  it('renders filtered empty state when date filter is active', () => {
    const html = renderToString(
      React.createElement(AssignmentsEmptyState, {
        hasAssignments: true,
        hasDateFilter: true,
      }),
    );

    expect(html).toContain('За обраними датами завдань не знайдено');
    expect(html).toContain('🔍');
  });

  it('renders all-completed celebratory state when assignments exist but none are pending and no date filter', () => {
    const html = renderToString(
      React.createElement(AssignmentsEmptyState, {
        hasAssignments: true,
        hasDateFilter: false,
      }),
    );

    expect(html).toContain('Ура, всі завдання виконані!');
    expect(html).toContain('🏖️');
  });
});
