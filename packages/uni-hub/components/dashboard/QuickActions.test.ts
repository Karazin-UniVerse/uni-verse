import { describe, it, expect } from 'vitest';
import type { Assignment } from '@uni-hub/types';
import { calculatePendingAssignmentsCount } from './QuickActions';

describe('QuickActions', () => {
  describe('calculatePendingAssignmentsCount', () => {
    it('counts only unsubmitted and ungraded assignments', () => {
      const assignments: Assignment[] = [
        {
          id: 1,
          name: 'Task 1',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'not_submitted',
          grade: null,
          graded: false,
        },
        {
          id: 2,
          name: 'Task 2',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'submitted',
          grade: null,
          graded: false,
        },
        {
          id: 3,
          name: 'Task 3',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'graded',
          grade: '95',
          graded: true,
        },
        {
          id: 4,
          name: 'Task 4',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'draft',
          grade: null,
          graded: false,
        },
      ];

      expect(calculatePendingAssignmentsCount(assignments)).toBe(2);
    });

    it('returns 0 when all assignments are submitted or graded', () => {
      const assignments: Assignment[] = [
        {
          id: 1,
          name: 'Task 1',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'submitted',
          grade: null,
          graded: false,
        },
        {
          id: 2,
          name: 'Task 2',
          courseName: 'Course 1',
          duedate: 1000,
          description: '',
          submissionStatus: 'graded',
          grade: '100',
          graded: true,
        },
      ];

      expect(calculatePendingAssignmentsCount(assignments)).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(calculatePendingAssignmentsCount([])).toBe(0);
    });
  });
});
