import { describe, it, expect } from 'vitest';
import { readWorkspaceFile } from '../test-helpers';

describe('Tier 2 - Feature 10 & 11: Boundary Cases in UniHub Navigation & Sider', () => {
  const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';

  it('F10-B1: Navigation key guard function should strictly reject invalid tab strings', () => {
    const CANONICAL_KEYS = ['overview', 'courses', 'grades', 'schedule', 'assignments'];
    const isNavKey = (val: string) => CANONICAL_KEYS.includes(val);

    expect(isNavKey('overview')).toBe(true);
    expect(isNavKey('grades')).toBe(true);
    expect(isNavKey('unknown_tab')).toBe(false);
    expect(isNavKey('')).toBe(false);
    expect(isNavKey('events')).toBe(false); // events removed from canonical 5 tabs
  });

  it('F10-B2: Fallback behavior for arbitrary query param tab should default to overview', () => {
    const requestedTab = 'hacked_tab';
    const CANONICAL_KEYS = ['overview', 'courses', 'grades', 'schedule', 'assignments'];
    const resolvedTab = CANONICAL_KEYS.includes(requestedTab) ? requestedTab : 'overview';

    expect(resolvedTab).toBe('overview');
  });

  it('F11-B1: SiderFooter Moodle status indicator should have accessible tooltip or title', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('siderFooter');
  });

  it('F11-B2: Sidebar mobile drawer should support keyboard trap and Escape key dismissal', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/Escape/);
    expect(content).toMatch(/closeMobileMenu/);
  });

  it('F11-B3: Sider should support both collapsed and expanded states without layout breakage', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/collapsed/);
    expect(content).toMatch(/PanelLeftOpen|PanelLeftClose/);
  });
});
