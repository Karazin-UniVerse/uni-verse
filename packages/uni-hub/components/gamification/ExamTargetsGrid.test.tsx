import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ExamTargetRequirement, GradeAccumulationResult } from '@core/utils/grades';
import { ExamTargetsGrid } from './ExamTargetsGrid';

const mockExamTargets: ExamTargetRequirement[] = [
  { grade: 'A', minTotalScore: 90, requiredExamScore: 40, isAchievable: true },
  { grade: 'B', minTotalScore: 82, requiredExamScore: 32, isAchievable: true },
  { grade: 'C', minTotalScore: 74, requiredExamScore: 24, isAchievable: true },
  { grade: 'D', minTotalScore: 64, requiredExamScore: 20, isAchievable: true },
  { grade: 'E', minTotalScore: 60, requiredExamScore: 20, isAchievable: true },
];

const mockAccumulationPassedC: GradeAccumulationResult = {
  totalScore: 75,
  ectsGrade: 'C',
  traditionalGrade: 'добре',
  isAdmittedToExam: true,
  isExamPassed: true,
  isCoursePassed: true,
  statusMessage: 'Дисципліну успішно складено',
};

const mockAccumulationNotPassed: GradeAccumulationResult = {
  totalScore: 45,
  ectsGrade: 'Fx',
  traditionalGrade: 'незадовільно',
  isAdmittedToExam: true,
  isExamPassed: false,
  isCoursePassed: false,
  statusMessage: 'Екзамен не складено',
};

describe('ExamTargetsGrid component', () => {
  it('should render exam targets grid with section title and minimum exam hint', () => {
    render(
      <ExamTargetsGrid
        examTargets={mockExamTargets}
        isAdmitted={true}
        accumulationResult={mockAccumulationPassedC}
      />,
    );

    const title = screen.getByText('Цільові бали на іспиті («Що потрібно для оцінки?»)');
    const hint = screen.getByText('Мін. екзамену: 20 б.');

    expect(title).toBeInTheDocument();
    expect(hint).toBeInTheDocument();
  });

  it('should render target cards with grade, minimum total score, and required exam score', () => {
    render(
      <ExamTargetsGrid
        examTargets={mockExamTargets}
        isAdmitted={true}
        accumulationResult={mockAccumulationPassedC}
      />,
    );

    mockExamTargets.forEach((target) => {
      const grade = screen.getByText(target.grade);
      const points = screen.getByText(`≥ ${target.minTotalScore} б.`);
      const card = grade.closest('div');

      expect(grade).toBeInTheDocument();
      expect(points).toBeInTheDocument();
      expect(card).toHaveTextContent(`${target.requiredExamScore} б.`);
    });
  });

  it('should display "Недопуск" for all targets when isAdmitted is false', () => {
    render(
      <ExamTargetsGrid
        examTargets={mockExamTargets}
        isAdmitted={false}
        accumulationResult={mockAccumulationNotPassed}
      />,
    );

    const statuses = screen.getAllByText('Недопуск');

    expect(statuses).toHaveLength(mockExamTargets.length);

    mockExamTargets.forEach((target) => {
      const grade = screen.getByText(target.grade);
      const card = grade.closest('div');

      expect(card?.className).toMatch(/targetCardUnreachable/);
      expect(card?.className).not.toMatch(/targetCardActive/);
    });
  });

  it('should display "Недосяжно" when target is not achievable', () => {
    const targetsWithUnachievable: ExamTargetRequirement[] = [
      { grade: 'A', minTotalScore: 90, requiredExamScore: 45, isAchievable: false },
      { grade: 'B', minTotalScore: 82, requiredExamScore: 37, isAchievable: true },
    ];

    render(
      <ExamTargetsGrid
        examTargets={targetsWithUnachievable}
        isAdmitted={true}
        accumulationResult={mockAccumulationPassedC}
      />,
    );

    const unachievableGrade = screen.getByText('A');
    const unachievableCard = unachievableGrade.closest('div');
    const achievableGrade = screen.getByText('B');
    const achievableCard = achievableGrade.closest('div');

    expect(screen.getByText('Недосяжно')).toBeInTheDocument();
    expect(unachievableCard).toHaveTextContent('Недосяжно');
    expect(unachievableCard?.className).toMatch(/targetCardUnreachable/);

    expect(achievableCard).toHaveTextContent('37 б.');
    expect(achievableCard?.className).not.toMatch(/targetCardUnreachable/);
  });

  it('should highlight target card when course is passed and current ECTS grade matches target grade', () => {
    render(
      <ExamTargetsGrid
        examTargets={mockExamTargets}
        isAdmitted={true}
        accumulationResult={mockAccumulationPassedC}
      />,
    );

    const activeGrade = screen.getByText('C');
    const activeCard = activeGrade.closest('div');
    const otherGrade = screen.getByText('A');
    const otherCard = otherGrade.closest('div');

    expect(activeCard?.className).toMatch(/targetCardActive/);
    expect(otherCard?.className).not.toMatch(/targetCardActive/);
  });

  it('should not highlight any target card when course is not passed', () => {
    const accumulationWithMatchingGradeNotPassed: GradeAccumulationResult = {
      ...mockAccumulationNotPassed,
      ectsGrade: 'C',
      isCoursePassed: false,
    };

    render(
      <ExamTargetsGrid
        examTargets={mockExamTargets}
        isAdmitted={true}
        accumulationResult={accumulationWithMatchingGradeNotPassed}
      />,
    );

    const gradeC = screen.getByText('C');
    const cardC = gradeC.closest('div');

    expect(cardC?.className).not.toMatch(/targetCardActive/);
  });
});
