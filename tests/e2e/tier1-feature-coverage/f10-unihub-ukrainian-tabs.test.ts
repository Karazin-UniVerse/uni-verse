import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';
import { uk } from '../../../packages/uni-hub/i18n/locales/uk';

describe('Tier 1 - Feature 10: Dashboard navigation localization (@universe/uni-hub)', () => {
  const sidebarPath = 'packages/uni-hub/views/dashboard/layout/DashboardSidebar.tsx';

  it('F10-1: dashboard sidebar should exist', () => {
    expect(fileExists(sidebarPath)).toBe(true);
  });

  it('F10-2: overview and study navigation labels should be Ukrainian', () => {
    expect(uk['nav.overview']).toBe('Стіна');
    expect(uk['nav.study']).toBe('Навчання');
  });

  it('F10-3: schedule and opportunities navigation labels should be Ukrainian', () => {
    expect(uk['nav.schedule']).toBe('Розклад');
    expect(uk['nav.opportunities']).toBe('Можливості');
  });

  it('F10-4: navigation uses translation keys rather than hardcoded legacy labels', () => {
    const content = readWorkspaceFile(sidebarPath);

    expect(content).toContain("labelKey: 'nav.overview'");
    expect(content).toContain("labelKey: 'nav.study'");
    expect(content).not.toMatch(/label:\s*['"](?:Обзор|Курсы|Оценки|Расписание)['"]/);
  });

  it('F10-5: dashboard overview and grade views are split into focused modules', () => {
    expect(fileExists('packages/uni-hub/views/dashboard/tabs/OverviewTab.tsx')).toBe(true);
    expect(fileExists('packages/uni-hub/views/dashboard/tabs/GradesTab.tsx')).toBe(true);
  });

  it('F10-6: study subtabs include the current localized grade and assignment labels', () => {
    expect(uk['study.views.grades']).toBe('Оцінки');
    expect(uk['study.views.assignments']).toBe('Завдання');
  });
});
