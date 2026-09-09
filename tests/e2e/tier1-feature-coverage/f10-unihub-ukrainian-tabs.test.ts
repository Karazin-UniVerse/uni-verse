import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 10: E-Dean 5 Canonical Ukrainian Tabs (@universe/uni-hub)', () => {
  const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';

  it('F10-1: DashboardPage.tsx should exist', () => {
    expect(fileExists(dashboardPath)).toBe(true);
  });

  it('F10-2: Tab 1 should be Ukrainian canonical: «Картка студента / Огляд»', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('Картка студента / Огляд');
  });

  it('F10-3: Tab 2 should be Ukrainian canonical: «Індивідуальний план»', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('Індивідуальний план');
  });

  it('F10-4: Tab 3 should be Ukrainian canonical: «Заліковка та бали»', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('Заліковка та бали');
  });

  it('F10-5: Tab 4 and 5 should be Ukrainian canonical: «Розклад занять» and «Завдання»', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('Розклад занять');
    expect(content).toContain('Завдання');
  });

  it('F10-6: DashboardPage navigation should NOT contain legacy Russian tab labels', () => {
    const content = readWorkspaceFile(dashboardPath);

    // Menu items array must not contain legacy Russian strings
    expect(content).not.toMatch(/label:\s*['"]Обзор['"]/);
    expect(content).not.toMatch(/label:\s*['"]Курсы['"]/);
    expect(content).not.toMatch(/label:\s*['"]Оценки['"]/);
    expect(content).not.toMatch(/label:\s*['"]Расписание['"]/);
  });
});
