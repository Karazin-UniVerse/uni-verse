import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 11: Sidebar Footer Moodle Status Indicator (@universe/uni-hub)', () => {
  const sidebarPath = 'packages/uni-hub/views/dashboard/layout/DashboardSidebar.tsx';

  it('F11-1: sidebar footer should be present in DashboardSidebar', () => {
    expect(fileExists(sidebarPath)).toBe(true);
    const content = readWorkspaceFile(sidebarPath);

    expect(content).toContain('siderFooter');
  });

  it('F11-2: siderFooter should render link pointing to https://moodle.universemvp.tech', () => {
    const content = readWorkspaceFile(sidebarPath);

    expect(content).toContain('https://moodle.universemvp.tech');
  });

  it('F11-3: siderFooter link should display moodle.universemvp.tech label', () => {
    const content = readWorkspaceFile(sidebarPath);

    expect(content).toMatch(/moodle\.universemvp\.tech/);
  });

  it('F11-4: siderFooter link should include an active status indicator (dot/badge)', () => {
    const content = readWorkspaceFile(sidebarPath);

    // Should have active indicator dot or status dot
    expect(content).toMatch(/statusDot|activeDot|onlineDot|indicator|connected/i);
  });

  it('F11-5: siderFooter external link should have target="_blank" and rel="noopener noreferrer"', () => {
    const content = readWorkspaceFile(sidebarPath);
    const moodleAnchorMatch = content.match(
      /<a\b[^>]*href=['"]https:\/\/moodle\.universemvp\.tech['"][^>]*>/,
    );

    expect(moodleAnchorMatch).not.toBeNull();
    const anchorTag = moodleAnchorMatch![0];

    expect(anchorTag).toMatch(/target=['"]_blank['"]/);
    expect(anchorTag).toMatch(/rel=['"][^'"]*noopener[^'"]*['"]/);
    expect(anchorTag).toMatch(/rel=['"][^'"]*noreferrer[^'"]*['"]/);
  });
});
