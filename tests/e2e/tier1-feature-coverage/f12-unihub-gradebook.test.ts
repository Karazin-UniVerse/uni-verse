import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 12: Digital Gradebook 3-Tier Grade Display (@universe/uni-hub)', () => {
  const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';

  it('F12-1: DashboardPage.tsx should define a table for grades visualization', () => {
    expect(fileExists(dashboardPath)).toBe(true);
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('<table');
    expect(content).toContain('renderGrades');
  });

  it('F12-2: Grades table should include 100-point score column or representation', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/100-бальн|Бал|100\s*бал/i);
  });

  it('F12-3: Grades table should include ECTS letter grade column (A-F)', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/ECTS/i);
  });

  it('F12-4: Grades table should include traditional Ukrainian grade column', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/Традиційн|Національн|Оцінка/i);
  });

  it('F12-5: Grades table headers must be in Ukrainian language', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/Дисципліна|Курс/);
    expect(content).not.toMatch(/<th>Оценка<\/th>/);
  });
});
