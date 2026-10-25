import { describe, it, expect } from 'vitest';
import { readWorkspaceFile } from '../test-helpers';
import { NAV_KEY, STUDY_VIEW } from '../../../packages/uni-hub/views/dashboard/constants';
import {
  getNavKeyFromPathname,
  getStudyHref,
  NAV_KEY_ROUTE,
} from '../../../packages/uni-hub/views/dashboard/routes';
import { isStudyView } from '../../../packages/uni-hub/views/dashboard/utils';

describe('Tier 2 - Feature 10 & 11: Boundary Cases in UniHub Navigation & Sider', () => {
  const dashboardPath = 'packages/uni-hub/views/dashboard/layout/DashboardSidebar.tsx';

  it('F10-B1: every current navigation key resolves from its route', () => {
    expect(Object.values(NAV_KEY)).toEqual([
      'overview',
      'study',
      'schedule',
      'connectMoodle',
      'opportunities',
    ]);

    for (const key of Object.values(NAV_KEY)) {
      expect(getNavKeyFromPathname(NAV_KEY_ROUTE[key])).toBe(key);
    }
  });

  it('F10-B2: invalid paths fall back to overview and only current study views are accepted', () => {
    expect(getNavKeyFromPathname('/hacked_tab')).toBe(NAV_KEY.Overview);
    expect(getNavKeyFromPathname('/studying')).toBe(NAV_KEY.Overview);
    expect(isStudyView(STUDY_VIEW.Subjects)).toBe(true);
    expect(isStudyView(STUDY_VIEW.Grades)).toBe(true);
    expect(isStudyView(STUDY_VIEW.Assignments)).toBe(true);
    expect(isStudyView('hacked_tab')).toBe(false);
    expect(getStudyHref(STUDY_VIEW.Grades)).toBe('/study?view=grades');
  });

  it('F11-B1: SiderFooter Moodle status indicator should have accessible tooltip or title', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toContain('siderFooter');
    expect(content).toContain("title={formatMessage('sidebar.moodleConnected')}");
  });

  it('F11-B2: Sidebar mobile drawer should support keyboard trap and Escape key dismissal', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/Escape/);
    expect(content).toContain('onCloseMobileMenu');
    expect(content).toContain("event.key === 'Tab'");
  });

  it('F11-B3: Sider should support both collapsed and expanded states without layout breakage', () => {
    const content = readWorkspaceFile(dashboardPath);

    expect(content).toMatch(/collapsed/);
    expect(content).toContain('onToggleCollapsed');
    expect(content).toContain("collapsed ? 'sidebar.expand' : 'sidebar.collapse'");
  });
});
