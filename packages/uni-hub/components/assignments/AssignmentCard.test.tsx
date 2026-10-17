import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should render assignment name and course name correctly', () => {
    render(
      <AssignmentCard
        assignment={mockAssignment}
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText('Практична робота №1')).toBeInTheDocument();
    expect(screen.getByText('Математичний аналіз')).toBeInTheDocument();
    expect(screen.getByText(/Дедлайн:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /відкрити/i })).toBeInTheDocument();
  });

  it('should render grade badge when grade is present', () => {
    render(
      <AssignmentCard
        assignment={mockAssignment}
        grade="95"
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText(/Оцінка:\s*95/i)).toBeInTheDocument();
  });

  it('should render no-deadline text when duedate is 0', () => {
    const noDeadlineAssignment: Assignment = {
      ...mockAssignment,
      duedate: 0,
    };

    render(
      <AssignmentCard
        assignment={noDeadlineAssignment}
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText('Без терміну здачі')).toBeInTheDocument();
  });

  it('should render awaiting review status with warning tone when submitted without grade', () => {
    render(
      <AssignmentCard
        assignment={mockAssignment}
        status="submitted"
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText('Очікує перевірки')).toBeInTheDocument();
  });

  it('should render submitted late tag when isLate is true', () => {
    const lateAssignment: Assignment = {
      ...mockAssignment,
      isLate: true,
    };

    render(
      <AssignmentCard
        assignment={lateAssignment}
        status="submitted"
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText('Здано із запізненням')).toBeInTheDocument();
  });

  it('should not render submitted late tag when assignment is not completed even if isLate is true', () => {
    const lateAssignment: Assignment = {
      ...mockAssignment,
      isLate: true,
    };

    render(
      <AssignmentCard
        assignment={lateAssignment}
        status="new"
        nowSec={1750000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.queryByText('Здано із запізненням')).not.toBeInTheDocument();
    expect(screen.getByText('Прострочено')).toBeInTheDocument();
  });

  it('should not render submitted late tag when assignment is not completed with submittedAt past duedate', () => {
    const incompleteAssignment: Assignment = {
      ...mockAssignment,
      isLate: false,
      submittedAt: 1740000000,
    };

    render(
      <AssignmentCard
        assignment={incompleteAssignment}
        status="new"
        nowSec={1750000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.queryByText('Здано із запізненням')).not.toBeInTheDocument();
    expect(screen.getByText('Прострочено')).toBeInTheDocument();
  });

  it('should respect explicit isLate false from backend even when submittedAt is after duedate', () => {
    const onTimeAssignment: Assignment = {
      ...mockAssignment,
      isLate: false,
      submittedAt: 1740000000,
    };

    render(
      <AssignmentCard
        assignment={onTimeAssignment}
        status="submitted"
        nowSec={1750000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.queryByText('Здано із запізненням')).not.toBeInTheDocument();
  });

  it('should not treat Moodle -1 sentinel grade as graded', () => {
    render(
      <AssignmentCard
        assignment={mockAssignment}
        grade="-1"
        status="new"
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.queryByText(/Оцінка:/i)).not.toBeInTheDocument();
  });

  it('should render in-progress status label when not completed and before deadline', () => {
    render(
      <AssignmentCard
        assignment={mockAssignment}
        status="new"
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={() => {}}
      />,
    );

    expect(screen.getByText('В процесі')).toBeInTheDocument();
  });

  it('should trigger onOpenAssignment when open button is clicked', async () => {
    const handleOpen = vi.fn();
    const user = userEvent.setup();

    render(
      <AssignmentCard
        assignment={mockAssignment}
        nowSec={1700000000}
        soundEnabled={false}
        onOpenAssignment={handleOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: /відкрити/i }));
    expect(handleOpen).toHaveBeenCalledTimes(1);
    expect(handleOpen).toHaveBeenCalledWith(mockAssignment);
  });
});
