import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Assignment } from '@uni-hub/types';
import { AssignmentCard } from './AssignmentCard';

describe('AssignmentCard component', () => {
  const mockAssignment: Assignment = {
    id: 1,
    courseName: 'Математичний аналіз',
    name: 'Практична робота №1',
    duedate: 1735689600, // 2025-01-01
    description: 'Опис завдання',
  };

  it('renders assignment name and course name correctly', () => {
    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: mockAssignment,
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).toContain('Практична робота №1');
    expect(html).toContain('Математичний аналіз');
    expect(html).toContain('Дедлайн:');
    expect(html).toContain('Відкрити');
  });

  it('renders grade badge when grade is present', () => {
    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: mockAssignment,
        grade: '95',
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).toContain('Оцінка:');
    expect(html).toContain('95');
  });

  it('renders no-deadline text when duedate is 0', () => {
    const noDeadlineAssignment: Assignment = {
      ...mockAssignment,
      duedate: 0,
    };

    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: noDeadlineAssignment,
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).toContain('Без терміну здачі');
  });
});
