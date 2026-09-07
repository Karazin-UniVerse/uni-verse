import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 11: Sidebar Footer Moodle Status Indicator (@universe/uni-hub)', () => {
  const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';

  it('F11-1: siderFooter container should be present in DashboardPage.tsx', () => {
    expect(fileExists(dashboardPath)).toBe(true);
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('siderFooter');
  });

  it('F11-2: siderFooter should render link pointing to https://moodle.universemvp.tech', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('https://moodle.universemvp.tech');
  });

  it('F11-3: siderFooter link should display moodle.universemvp.tech label', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/moodle\.universemvp\.tech/);
  });

  it('F11-4: siderFooter link should include an active status indicator (dot/badge)', () => {
    const content = readWorkspaceFile(dashboardPath);

    // Should have active indicator dot or status dot
    expect(content).toMatch(/statusDot|activeDot|onlineDot|indicator|connected/i);
  });

  it('F11-5: siderFooter external link should have target="_blank" and rel="noopener noreferrer"', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/target=['"]_blank['"]/);
    expect(content).toMatch(/rel=['"][^'"]*noopener[^'"]*['"]/);
  });
});
