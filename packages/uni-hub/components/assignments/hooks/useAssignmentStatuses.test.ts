import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Assignment } from '@core/types/moodle';
import {
  getAssignmentsNeedingStatus,
  toLocalStatuses,
  useAssignmentStatuses,
} from './useAssignmentStatuses';

function buildAssignment(id: number, submissionStatus?: string): Assignment {
  return {
    id,
    name: `Assignment ${id}`,
    courseName: 'Math',
    description: 'Description',
    duedate: 1700000000,
    submissionStatus,
  };
}

function renderWithClient(element: React.ReactElement): string {
  const queryClient = new QueryClient();

  return renderToString(React.createElement(QueryClientProvider, { client: queryClient }, element));
}

describe('getAssignmentsNeedingStatus', () => {
  it('returns the ids of assignments without a submission status, once each', () => {
    const ids = getAssignmentsNeedingStatus([
      buildAssignment(1),
      buildAssignment(2, 'submitted'),
      buildAssignment(3),
      buildAssignment(1),
    ]);

    expect(ids).toEqual([1, 3]);
  });

  it('returns an empty list when every assignment already has a status', () => {
    expect(getAssignmentsNeedingStatus([buildAssignment(2, 'graded')])).toEqual([]);
  });
});

describe('toLocalStatuses', () => {
  it('keeps only the assignments whose status was loaded', () => {
    const statuses = toLocalStatuses(
      [1, 2],
      [{ data: { status: 'submitted', grade: '95' } }, { data: undefined }],
    );

    expect(statuses).toEqual({ 1: { status: 'submitted', grade: '95' } });
  });
});

describe('useAssignmentStatuses hook', () => {
  it('returns an empty record before any status has loaded', () => {
    const TestComponent: React.FC = () => {
      const statuses = useAssignmentStatuses([buildAssignment(101)]);

      return React.createElement('div', null, String(Object.keys(statuses).length));
    };

    expect(renderWithClient(React.createElement(TestComponent))).toContain('0');
  });

  it('renders without error when given empty assignments', () => {
    const TestComponent: React.FC = () => {
      const statuses = useAssignmentStatuses([]);

      return React.createElement('div', null, JSON.stringify(statuses));
    };

    expect(renderWithClient(React.createElement(TestComponent))).toContain('{}');
  });
});
