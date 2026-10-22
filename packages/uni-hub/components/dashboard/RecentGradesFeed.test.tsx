import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Assignment } from '@core/types/moodle';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { RecentGradesFeed } from './RecentGradesFeed';

const mockAssignments: Assignment[] = [
  {
    id: 1,
    name: 'Алгоритми та структури даних: Лабораторна 1',
    courseName: 'Алгоритми',
    duedate: 1700000000,
    submittedAt: 1700001000,
    description: 'Лабораторна робота',
    grade: '95',
    graded: true,
  },
  {
    id: 2,
    name: 'Бази даних: Практична 2',
    courseName: 'Бази даних',
    duedate: 1700002000,
    submittedAt: 1700003000,
    description: 'Практична робота',
    grade: '82',
    graded: true,
  },
  {
    id: 3,
    name: 'Веб-технології: Проєкт',
    courseName: 'Веб-технології',
    duedate: 1700004000,
    submittedAt: 1700005000,
    description: 'Курсовий проєкт',
    grade: '65',
    submissionStatus: 'graded',
  },
  {
    id: 4,
    name: 'Компʼютерні мережі: Есе',
    courseName: 'Компʼютерні мережі',
    duedate: 1700006000,
    submittedAt: 1700007000,
    description: 'Есе на тему OSI',
    grade: null,
    graded: true,
  },
  {
    id: 5,
    name: 'Операційні системи: Лабораторна 3',
    courseName: 'Операційні системи',
    duedate: 1700008000,
    submittedAt: 1700009000,
    description: 'Робота з процесами',
    grade: '100',
    graded: true,
  },
  {
    id: 6,
    name: 'Дискретна математика: Модуль 1',
    courseName: 'Дискретна математика',
    duedate: 1700010000,
    submittedAt: 1700011000,
    description: 'Модульний контроль',
    grade: '55',
    graded: true,
  },
];

const renderRecentGradesFeed = (
  props: React.ComponentProps<typeof RecentGradesFeed>,
) => render(withLanguage(<RecentGradesFeed {...props} />));

describe('RecentGradesFeed component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'en');
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
  });

  it('should render recent grades feed with accessible heading and grade items', () => {
    const handleNavigate = vi.fn();

    renderRecentGradesFeed({
      assignments: [mockAssignments[0], mockAssignments[1]],
      onNavigate: handleNavigate,
    });

    const section = screen.getByRole('region', { name: 'Recent Grades' });
    const heading = screen.getByRole('heading', { level: 3, name: 'Recent Grades' });

    expect(section).toBeInTheDocument();
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Алгоритми та структури даних: Лабораторна 1')).toBeInTheDocument();
    expect(screen.getByText('Алгоритми')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('Бази даних: Практична 2')).toBeInTheDocument();
    expect(screen.getByText('Бази даних')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('should render empty state when no graded assignments exist', () => {
    const handleNavigate = vi.fn();
    const ungradedAssignments: Assignment[] = [
      {
        id: 99,
        name: 'Неоцінене завдання',
        courseName: 'Філософія',
        duedate: 1700000000,
        submittedAt: null,
        description: 'В процесі перевірки',
        grade: null,
        graded: false,
        submissionStatus: 'submitted',
      },
    ];

    renderRecentGradesFeed({
      assignments: ungradedAssignments,
      onNavigate: handleNavigate,
    });

    expect(screen.getByText('No graded assignments yet')).toBeInTheDocument();
    expect(screen.queryByText('Неоцінене завдання')).not.toBeInTheDocument();
  });

  it('should trigger onNavigate to grades when all grades button is clicked', async () => {
    const user = userEvent.setup();
    const handleNavigate = vi.fn();

    renderRecentGradesFeed({
      assignments: [mockAssignments[0]],
      onNavigate: handleNavigate,
    });

    const allGradesButton = screen.getByRole('button', { name: 'All grades' });

    await user.click(allGradesButton);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('study', 'grades');
  });

  it('should trigger onNavigate to assignments when a grade feed item is clicked', async () => {
    const user = userEvent.setup();
    const handleNavigate = vi.fn();

    renderRecentGradesFeed({
      assignments: [mockAssignments[0]],
      onNavigate: handleNavigate,
    });

    const feedItem = screen.getByRole('button', {
      name: /Алгоритми та структури даних: Лабораторна 1/i,
    });

    await user.click(feedItem);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('study', 'assignments');
  });

  it('should respect maxItems limit', () => {
    const handleNavigate = vi.fn();

    renderRecentGradesFeed({
      assignments: mockAssignments,
      onNavigate: handleNavigate,
      maxItems: 3,
    });

    expect(screen.getByText('Дискретна математика: Модуль 1')).toBeInTheDocument();
    expect(screen.getByText('Операційні системи: Лабораторна 3')).toBeInTheDocument();
    expect(screen.getByText('Компʼютерні мережі: Есе')).toBeInTheDocument();

    expect(
      screen.queryByText('Алгоритми та структури даних: Лабораторна 1'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Бази даних: Практична 2')).not.toBeInTheDocument();
  });

  it('should display passed fallback score when assignment has no numeric grade', () => {
    const handleNavigate = vi.fn();
    const passedAssignment: Assignment[] = [
      {
        id: 10,
        name: 'Лабораторна без оцінки',
        courseName: 'Безпека мереж',
        duedate: 1700000000,
        submittedAt: 1700002000,
        description: 'Залік',
        grade: null,
        graded: true,
      },
    ];

    renderRecentGradesFeed({
      assignments: passedAssignment,
      onNavigate: handleNavigate,
    });

    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('should sort graded assignments by timestamp in descending order', () => {
    const handleNavigate = vi.fn();
    const items: Assignment[] = [
      {
        id: 101,
        name: 'Older Assignment',
        courseName: 'Course A',
        duedate: 1700001000,
        submittedAt: 1700001000,
        description: 'Older',
        grade: '90',
        graded: true,
      },
      {
        id: 102,
        name: 'Newer Assignment',
        courseName: 'Course B',
        duedate: 1700009000,
        submittedAt: 1700009000,
        description: 'Newer',
        grade: '95',
        graded: true,
      },
    ];

    renderRecentGradesFeed({
      assignments: items,
      onNavigate: handleNavigate,
    });

    const renderedItems = screen.getAllByRole('button');

    expect(renderedItems[1]).toHaveTextContent('Newer Assignment');
    expect(renderedItems[2]).toHaveTextContent('Older Assignment');
  });
});
