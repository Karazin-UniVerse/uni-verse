import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { StatCardGrid, type StatCardGridProps } from './StatCardGrid';

const renderStatCardGrid = (props: Partial<StatCardGridProps> = {}) => {
  const defaultProps: StatCardGridProps = {
    coursesCount: 5,
    assignmentsCount: 2,
    gpa: 4.75,
    onNavigate: vi.fn(),
  };
  const mergedProps = { ...defaultProps, ...props };

  return render(
    withLanguage(<StatCardGrid {...mergedProps} />),
  );
};

describe('StatCardGrid component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render three stat cards with localized titles, values, labels, and hints', () => {
    renderStatCardGrid({
      coursesCount: 6,
      assignmentsCount: 3,
      gpa: 4.8,
    });

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(3);

    // Courses card
    const coursesCard = screen.getByTitle('Перейти до списку курсів');

    expect(coursesCard).toBeInTheDocument();
    expect(coursesCard).toHaveStyle({ animationDelay: '0ms' });
    expect(screen.getByText('Всього дисциплін')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Переглянути курси →')).toBeInTheDocument();
    expect(coursesCard.querySelector('svg')).toBeInTheDocument();

    // Assignments card
    const assignmentsCard = screen.getByTitle('Перейти до списку завдань');

    expect(assignmentsCard).toBeInTheDocument();
    expect(assignmentsCard).toHaveStyle({ animationDelay: '40ms' });
    expect(screen.getByText('Завдань до виконання')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Переглянути завдання →')).toBeInTheDocument();
    expect(assignmentsCard.querySelector('svg')).toBeInTheDocument();

    // Grades card
    const gradesCard = screen.getByTitle('Перейти до залікової книжки та оцінок');

    expect(gradesCard).toBeInTheDocument();
    expect(gradesCard).toHaveStyle({ animationDelay: '80ms' });
    expect(screen.getByText('Рейтинговий бал (GPA)')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Залікова книжка →')).toBeInTheDocument();
    expect(gradesCard.querySelector('svg')).toBeInTheDocument();
  });

  it("should call onNavigate with 'study' and 'subjects' when courses card is clicked", async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderStatCardGrid({ onNavigate: handleNavigate });

    const coursesCard = screen.getByTitle('Перейти до списку курсів');

    await user.click(coursesCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('study', 'subjects');
  });

  it("should call onNavigate with 'study' and 'assignments' when assignments card is clicked", async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderStatCardGrid({ onNavigate: handleNavigate });

    const assignmentsCard = screen.getByTitle('Перейти до списку завдань');

    await user.click(assignmentsCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('study', 'assignments');
  });

  it("should call onNavigate with 'study' and 'grades' when grades card is clicked", async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    renderStatCardGrid({ onNavigate: handleNavigate });

    const gradesCard = screen.getByTitle('Перейти до залікової книжки та оцінок');

    await user.click(gradesCard);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('study', 'grades');
  });

  it('should format string and numeric GPA values correctly', () => {
    const { rerender } = renderStatCardGrid({ gpa: 4.85 });
    const getGradesCard = () => screen.getByTitle('Перейти до залікової книжки та оцінок');

    expect(within(getGradesCard()).getByText('4.85')).toBeInTheDocument();

    rerender(
      withLanguage(<StatCardGrid coursesCount={5} assignmentsCount={2} gpa="N/A" onNavigate={vi.fn()} />),
    );

    expect(within(getGradesCard()).getByText('N/A')).toBeInTheDocument();

    rerender(
      withLanguage(<StatCardGrid coursesCount={5} assignmentsCount={2} gpa="—" onNavigate={vi.fn()} />),
    );

    expect(within(getGradesCard()).getByText('—')).toBeInTheDocument();

    rerender(
      withLanguage(<StatCardGrid coursesCount={5} assignmentsCount={2} gpa={0} onNavigate={vi.fn()} />),
    );

    expect(within(getGradesCard()).getByText('0')).toBeInTheDocument();
  });
});
