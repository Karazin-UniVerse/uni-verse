import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { GradeTableRow, type GradeDisplayItem } from './GradeTableRow';

const renderRow = (grade: GradeDisplayItem, index = 0) => {
  return render(
    <LanguageProvider>
      <table>
        <tbody>
          <GradeTableRow grade={grade} index={index} />
        </tbody>
      </table>
    </LanguageProvider>,
  );
};

describe('GradeTableRow component', () => {
  it('should render course name, credits, scores, and grade tags correctly', () => {
    const grade: GradeDisplayItem = {
      courseName: 'Software Engineering',
      credits: 5,
      controlType: 'exam',
      currentScore: 52,
      examScore: 36,
      totalScore: 88,
      grade: '88',
      rawGrade: 88,
    };

    renderRow(grade, 2);

    const row = screen.getByRole('row');
    const cells = screen.getAllByRole('cell');
    const progressBar = screen.getByRole('progressbar');

    expect(row).toHaveStyle({ animationDelay: '80ms' });
    expect(cells).toHaveLength(8);
    expect(cells[0]).toHaveTextContent('Software Engineering');
    expect(cells[1]).toHaveTextContent('5 ECTS');
    expect(cells[2]).toHaveTextContent('Іспит');
    expect(cells[3]).toHaveTextContent('52');
    expect(cells[4]).toHaveTextContent('36');
    expect(cells[5]).toHaveTextContent('88');
    expect(progressBar).toHaveAttribute('aria-valuenow', '88');
    expect(cells[6]).toHaveTextContent('B');
    expect(cells[7]).toHaveTextContent('добре');
  });

  it('should render exam score formatted when controlType is exam', () => {
    const grade: GradeDisplayItem = {
      courseName: 'Databases',
      credits: 4,
      controlType: 'exam',
      currentScore: 40,
      examScore: 35,
      totalScore: 75,
      grade: '75',
    };

    renderRow(grade);

    const cells = screen.getAllByRole('cell');

    expect(cells[2]).toHaveTextContent('Іспит');
    expect(cells[4]).toHaveTextContent('35');
  });

  it('should display dash for exam score when controlType is credit', () => {
    const grade: GradeDisplayItem = {
      courseName: 'Physical Education',
      credits: 2,
      controlType: 'credit',
      currentScore: 85,
      examScore: 35,
      totalScore: 85,
      grade: '85',
    };

    renderRow(grade);

    const cells = screen.getAllByRole('cell');

    expect(cells[2]).toHaveTextContent('Залік');
    expect(cells[4]).toHaveTextContent('—');
    expect(cells[7]).toHaveTextContent('зараховано');
  });

  it.each<{
    totalScore: number;
    controlType: 'exam' | 'credit';
    expectedEcts: string;
    expectedTraditional: string;
  }>([
    { totalScore: 95, controlType: 'exam', expectedEcts: 'A', expectedTraditional: 'відмінно' },
    { totalScore: 85, controlType: 'exam', expectedEcts: 'B', expectedTraditional: 'добре' },
    { totalScore: 75, controlType: 'exam', expectedEcts: 'C', expectedTraditional: 'добре' },
    { totalScore: 65, controlType: 'exam', expectedEcts: 'D', expectedTraditional: 'задовільно' },
    { totalScore: 61, controlType: 'exam', expectedEcts: 'E', expectedTraditional: 'задовільно' },
    { totalScore: 45, controlType: 'exam', expectedEcts: 'Fx', expectedTraditional: 'незадовільно' },
    { totalScore: 20, controlType: 'exam', expectedEcts: 'F', expectedTraditional: 'незадовільно' },
    { totalScore: 75, controlType: 'credit', expectedEcts: 'C', expectedTraditional: 'зараховано' },
    { totalScore: 45, controlType: 'credit', expectedEcts: 'Fx', expectedTraditional: 'не зараховано' },
  ])(
    'should calculate ECTS ($expectedEcts) and traditional grade ($expectedTraditional) for $controlType score $totalScore',
    ({ totalScore, controlType, expectedEcts, expectedTraditional }) => {
      const grade: GradeDisplayItem = {
        courseName: 'Test Discipline',
        controlType,
        totalScore,
        rawGrade: totalScore,
        grade: String(totalScore),
      };

      renderRow(grade);

      const cells = screen.getAllByRole('cell');

      expect(cells[6]).toHaveTextContent(expectedEcts);
      expect(cells[7]).toHaveTextContent(expectedTraditional);
    },
  );

  it('should handle missing/null credits and scores gracefully', () => {
    const grade: GradeDisplayItem = {
      courseName: 'Calculus',
      credits: undefined,
      currentScore: null,
      examScore: null,
      totalScore: null,
      rawGrade: null,
      grade: '',
    };

    renderRow(grade);

    const cells = screen.getAllByRole('cell');

    expect(cells[0]).toHaveTextContent('Calculus');
    expect(cells[1]).toHaveTextContent('—');
    expect(cells[2]).toHaveTextContent('—');
    expect(cells[3]).toHaveTextContent('—');
    expect(cells[4]).toHaveTextContent('—');
    expect(cells[5]).toHaveTextContent('0');
    expect(cells[6]).toHaveTextContent('F');
    expect(cells[7]).toHaveTextContent('незадовільно');
  });

  it('should fallback to generated discipline title when courseName is missing', () => {
    const gradeWithName: GradeDisplayItem = {
      courseName: 'Biology',
      grade: '80',
      totalScore: 80,
    };

    const { unmount } = renderRow(gradeWithName, 0);

    expect(screen.getByText('Biology')).toBeInTheDocument();

    unmount();

    const gradeWithoutAnyName: GradeDisplayItem = {
      grade: '70',
      totalScore: 70,
    };

    renderRow(gradeWithoutAnyName, 3);

    expect(screen.getByText('Дисципліна #4')).toBeInTheDocument();
  });
});
