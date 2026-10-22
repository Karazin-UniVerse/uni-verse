import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockStorage = vi.hoisted(() => ({}) as Record<string, string>);
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockRemoveQueries = vi.fn();
let currentPathname = '/study';
let capturedLinkModalProps: { onSuccess?: () => void; open?: boolean } | null = null;
let capturedUnlinkModalProps: { onSuccess?: () => void; open?: boolean } | null = null;

vi.mock('@uni-hub/services/api', () => ({
  safeStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  },
}));

import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { useOpportunitiesStore } from '@uni-hub/store/useOpportunitiesStore';
import { OPPORTUNITY_SUB_TAB } from '../tabs/opportunities/constants';
import { DashboardShell } from './DashboardShell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => currentPathname,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    removeQueries: mockRemoveQueries,
  }),
}));

vi.mock('@core/utils/auth', () => ({
  isLoggedIn: () => true,
}));

vi.mock('@uni-hub/features', () => ({
  useFeatures: () => ({
    isMoodleIntegrationEnabled: true,
    isEDeanEnabled: true,
    isOpportunitiesPlatformEnabled: true,
    isFeaturePanelEnabled: false,
  }),
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

vi.mock('@uni-hub/hooks/useAuthMutations', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));

vi.mock('@uni-hub/store/useGamificationStore', () => ({
  useGamificationStore: () => vi.fn(),
}));

vi.mock('../hooks/useDailyStreak', () => ({ useDailyStreak: vi.fn() }));

vi.mock('../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [],
      unreadCount: 0,
      statistics: null,
    },
    studentProfile: { fullName: 'Student' },
    hasCachedData: true,
    error: null,
    errorUpdatedAt: 0,
    platformError: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../hooks/useDashboardErrorHandling', () => ({
  useDashboardErrorHandling: vi.fn(),
}));

vi.mock('./DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="dashboard-header" />,
}));

vi.mock('./DashboardSidebar', () => ({
  DashboardSidebar: () => <div data-testid="dashboard-sidebar" />,
  NAV_ITEMS: [
    { key: 'overview', labelKey: 'nav.overview' },
    { key: 'study', labelKey: 'nav.study', featureFlag: 'isMoodleIntegrationEnabled' },
    { key: 'schedule', labelKey: 'nav.schedule', featureFlag: 'isEDeanEnabled' },
    {
      key: 'opportunities',
      labelKey: 'nav.opportunities',
      featureFlag: 'isOpportunitiesPlatformEnabled',
    },
  ],
}));

vi.mock('@uni-hub/components/dashboard', () => ({
  DashboardSkeleton: () => null,
  MobileBottomNav: () => null,
}));

vi.mock('@uni-hub/components/gamification', () => ({
  BadgeSystem: () => null,
}));

vi.mock('@uni-hub/components/auth', () => ({
  LinkMoodleModal: (props: { onSuccess?: () => void; open?: boolean }) => {
    capturedLinkModalProps = props;

    return props.open ? <div data-testid="link-modal" /> : null;
  },
  UnlinkMoodleModal: (props: { onSuccess?: () => void; open?: boolean }) => {
    capturedUnlinkModalProps = props;

    return props.open ? <div data-testid="unlink-modal" /> : null;
  },
  LinkMoodleMode: { CONNECT: 'connect', CHANGE: 'change' },
}));

describe('DashboardShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockStorage.isMoodleLinked;
    currentPathname = '/study';
    useMoodleStore.getState().resetSession();
    useOpportunitiesStore.getState().reset();
  });

  it('resets moodle and opportunities stores on unmount', () => {
    useMoodleStore.setState({
      dateFrom: '2026-05-01',
      isLinkModalOpen: true,
    });
    useOpportunitiesStore.setState({
      activeSubTab: OPPORTUNITY_SUB_TAB.MyApplications,
      search: 'developer',
    });

    const { unmount } = render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>,
    );

    unmount();

    expect(useMoodleStore.getState().dateFrom).toBe('');
    expect(useMoodleStore.getState().isLinkModalOpen).toBe(false);
    expect(useOpportunitiesStore.getState().activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Catalog);
    expect(useOpportunitiesStore.getState().search).toBe('');
  });

  it('syncs isMoodleLinked flag from storage on mount', () => {
    mockStorage.isMoodleLinked = 'false';

    render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>,
    );

    expect(useMoodleStore.getState().isMoodleLinked).toBe(false);
  });

  it('redirects from /connect-moodle to /wall when Moodle is already linked', () => {
    mockStorage.isMoodleLinked = 'true';
    currentPathname = '/connect-moodle';
    useMoodleStore.setState({ isMoodleLinked: true });

    render(
      <DashboardShell>
        <div>Connect Moodle Content</div>
      </DashboardShell>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/wall');
  });

  it('renders children when the active route matches the path', () => {
    mockStorage.isMoodleLinked = 'true';
    currentPathname = '/study';
    useMoodleStore.setState({ isMoodleLinked: true });

    render(
      <DashboardShell>
        <div>Study Children</div>
      </DashboardShell>,
    );

    expect(screen.getByText('Study Children')).toBeInTheDocument();
  });

  it('invalidates moodle queries and completes link on LinkMoodleModal success', () => {
    useMoodleStore.setState({ isMoodleLinked: false, isLinkModalOpen: true });

    render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>,
    );

    act(() => {
      capturedLinkModalProps?.onSuccess?.();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['moodle'] });
    expect(useMoodleStore.getState().isMoodleLinked).toBe(true);
  });

  it('removes moodle queries and completes unlink on UnlinkMoodleModal success', () => {
    useMoodleStore.setState({ isMoodleLinked: true, isUnlinkModalOpen: true });

    render(
      <DashboardShell>
        <div>Content</div>
      </DashboardShell>,
    );

    act(() => {
      capturedUnlinkModalProps?.onSuccess?.();
    });

    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['moodle'] });
    expect(useMoodleStore.getState().isMoodleLinked).toBe(false);
  });
});
