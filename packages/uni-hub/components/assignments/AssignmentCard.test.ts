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

  it('renders awaiting review status with warning tone when submitted without grade', () => {
    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: mockAssignment,
        status: 'submitted',
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).toContain('Очікує перевірки');
  });

  it('renders submitted late tag when isLate is true', () => {
    const lateAssignment: Assignment = {
      ...mockAssignment,
      isLate: true,
    };

    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: lateAssignment,
        status: 'submitted',
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).toContain('Здано із запізненням');
  });

  it('does not render submitted late tag when assignment is not completed even if isLate is true', () => {
    const lateAssignment: Assignment = {
      ...mockAssignment,
      isLate: true,
    };

    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: lateAssignment,
        status: 'new',
        nowSec: 1750000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).not.toContain('Здано із запізненням');
    expect(html).toContain('Прострочено');
  });

  it('does not render submitted late tag when assignment is not completed with submittedAt past duedate', () => {
    const incompleteAssignment: Assignment = {
      ...mockAssignment,
      isLate: false,
      submittedAt: 1740000000,
    };

    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: incompleteAssignment,
        status: 'new',
        nowSec: 1750000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).not.toContain('Здано із запізненням');
    expect(html).toContain('Прострочено');
  });

  it('respects explicit isLate false from backend even when submittedAt is after duedate', () => {
    const onTimeAssignment: Assignment = {
      ...mockAssignment,
      isLate: false,
      submittedAt: 1740000000,
    };

    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: onTimeAssignment,
        status: 'submitted',
        nowSec: 1750000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).not.toContain('Здано із запізненням');
  });

  it('does not treat Moodle -1 sentinel grade as graded', () => {
    const html = renderToString(
      React.createElement(AssignmentCard, {
        assignment: mockAssignment,
        grade: '-1',
        status: 'new',
        nowSec: 1700000000,
        soundEnabled: false,
        onOpenAssignment: () => {},
      }),
    );

    expect(html).not.toContain('Оцінка:');
  });
});
