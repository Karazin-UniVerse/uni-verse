import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Assignment } from '@uni-hub/types';
import { RemainingAssignmentsSection } from './RemainingAssignmentsSection';

function createAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const defaultAssignment: Assignment = {
    id: 1,
    courseName: 'Вища математика',
    name: 'Лабораторна робота №1',
    duedate: 1776337200,
    description: 'Опис завдання',
  };

  return {
    ...defaultAssignment,
    ...overrides,
  };
}

describe('RemainingAssignmentsSection component', () => {
  it('should render null when remainingAssignments array is empty', () => {
    const { container } = render(
      <RemainingAssignmentsSection
        remainingAssignments={[]}
        assignmentScores={{}}
        onScoreChange={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render assignment list with names, count, and scores when assignments exist', () => {
    const assignments: Assignment[] = [
      createAssignment({ id: 101, name: 'Лабораторна робота №1' }),
      createAssignment({ id: 102, name: 'Практичне заняття №2' }),
    ];
    const scores: Record<number, number> = {
      101: 90,
      102: 80,
    };

    render(
      <RemainingAssignmentsSection
        remainingAssignments={assignments}
        assignmentScores={scores}
        onScoreChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Окремі завдання семестру (2)')).toBeInTheDocument();
    expect(screen.getByText('Впливають на семестровий бал')).toBeInTheDocument();

    expect(screen.getByText('Лабораторна робота №1')).toBeInTheDocument();
    expect(screen.getByTitle('Лабораторна робота №1')).toBeInTheDocument();
    expect(screen.getByText('90 %')).toBeInTheDocument();

    expect(screen.getByText('Практичне заняття №2')).toBeInTheDocument();
    expect(screen.getByTitle('Практичне заняття №2')).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();

    const firstSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Лабораторна робота №1',
    });
    const secondSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Практичне заняття №2',
    });

    expect(firstSlider).toHaveValue('90');
    expect(secondSlider).toHaveValue('80');
  });

  it('should use default score 75 when assignment score is not in assignmentScores map', () => {
    const assignments: Assignment[] = [
      createAssignment({ id: 201, name: 'Модульний контроль №1' }),
      createAssignment({ id: 202, name: 'Тестове завдання №2' }),
    ];
    const scores: Record<number, number> = {
      201: 85,
    };

    render(
      <RemainingAssignmentsSection
        remainingAssignments={assignments}
        assignmentScores={scores}
        onScoreChange={vi.fn()}
      />,
    );

    expect(screen.getByText('85 %')).toBeInTheDocument();
    expect(screen.getByText('75 %')).toBeInTheDocument();

    const fallbackSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Тестове завдання №2',
    });

    expect(fallbackSlider).toHaveValue('75');
  });

  it('should trigger onScoreChange when assignment slider is moved/changed', () => {
    const handleScoreChange = vi.fn();
    const assignments: Assignment[] = [
      createAssignment({ id: 301, name: 'Курсовий проєкт' }),
      createAssignment({ id: 302, name: 'Екзаменаційний тест' }),
    ];
    const scores: Record<number, number> = {
      301: 70,
      302: 60,
    };

    render(
      <RemainingAssignmentsSection
        remainingAssignments={assignments}
        assignmentScores={scores}
        onScoreChange={handleScoreChange}
      />,
    );

    const firstSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Курсовий проєкт',
    });

    fireEvent.change(firstSlider, { target: { value: '92' } });

    expect(handleScoreChange).toHaveBeenCalledTimes(1);
    expect(handleScoreChange).toHaveBeenCalledWith(301, 92);

    const secondSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Екзаменаційний тест',
    });

    fireEvent.change(secondSlider, { target: { value: '84' } });

    expect(handleScoreChange).toHaveBeenCalledTimes(2);
    expect(handleScoreChange).toHaveBeenLastCalledWith(302, 84);
  });
});
