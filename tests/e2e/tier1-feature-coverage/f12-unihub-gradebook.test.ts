import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';
import { uk } from '../../../packages/uni-hub/i18n/locales/uk';

describe('Tier 1 - Feature 12: Digital Gradebook 3-Tier Grade Display (@universe/uni-hub)', () => {
  const gradesTabPath = 'packages/uni-hub/views/dashboard/tabs/GradesTab.tsx';

  it('F12-1: GradesTab should render the grades table and grade chart', () => {
    expect(fileExists(gradesTabPath)).toBe(true);
    const content = readWorkspaceFile(gradesTabPath);

    expect(content).toContain('<table');
    expect(content).toContain('<GradesChart');
    expect(content).toContain('<GradeTableRow');
  });

  it('F12-2: GradeTableRow should render total score on the 100-point scale', () => {
    const content = readWorkspaceFile('packages/uni-hub/views/dashboard/tabs/GradeTableRow.tsx');

    expect(content).toContain('totalScore');
    expect(content).toContain('score100Cell');
  });

  it('F12-3: GradeTableRow should calculate and render an ECTS grade', () => {
    const content = readWorkspaceFile('packages/uni-hub/views/dashboard/tabs/GradeTableRow.tsx');

    expect(content).toContain('calculateEctsGrade');
    expect(content).toContain('{ects}');
  });

  it('F12-4: GradeTableRow should calculate and render the traditional grade', () => {
    const content = readWorkspaceFile('packages/uni-hub/views/dashboard/tabs/GradeTableRow.tsx');

    expect(content).toContain('calculateTraditionalGrade');
    expect(content).toContain('{traditionalGrade}');
  });

  it('F12-5: Grade table headers should use Ukrainian translations', () => {
    expect(uk['grades.colCourse']).toBe('Дисципліна');
    expect(uk['grades.colEcts']).toBe('Оцінка ECTS');
    expect(uk['grades.colTraditional']).toContain('Традиційна');

    const content = readWorkspaceFile(gradesTabPath);

    expect(content).toContain("formatMessage('grades.colCourse')");
  });
});
