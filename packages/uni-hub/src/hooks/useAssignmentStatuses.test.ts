import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Assignment } from '@uni-hub/types';
import { useAssignmentStatuses } from './useAssignmentStatuses';

describe('useAssignmentStatuses hook', () => {
  it('returns empty record initially during SSR', () => {
    const TestComponent: React.FC = () => {
      const assignments: Assignment[] = [
        {
          id: 101,
          name: 'Math Homework',
          courseName: 'Math',
          description: 'Description',
          duedate: 1700000000,
        },
      ];
      const statuses = useAssignmentStatuses(assignments);

      return React.createElement(
        'div',
        { 'data-testid': 'status-count' },
        String(Object.keys(statuses).length),
      );
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('0');
  });

  it('renders without error when given empty assignments', () => {
    const TestComponent: React.FC = () => {
      const statuses = useAssignmentStatuses([]);

      return React.createElement('div', { 'data-testid': 'empty-check' }, JSON.stringify(statuses));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('{}');
  });
});
