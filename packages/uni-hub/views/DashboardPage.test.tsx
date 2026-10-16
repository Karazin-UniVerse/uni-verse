import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import type { DashboardData } from './dashboard/types';
import DashboardPage from './DashboardPage';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@core/utils/auth', () => ({
  isLoggedIn: vi.fn(() => true),
}));

vi.mock('@uni-hub/hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}));

vi.mock('@uni-hub/utils/soundEffects', () => ({
  playClick: vi.fn(),
  playSuccess: vi.fn(),
}));

vi.mock('@uni-hub/utils/confetti', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@uni-hub/components/assignments', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/components/assignments');

  return {
    ...actual,
    AssignmentModal: () => null,
  };
});

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
    Modal: ({
      open,
      title,
      children,
      onClose,
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      open ? (
        <dialog open aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          {onClose ? (
            <button type="button" aria-label="Close" onClick={onClose}>
              Close
            </button>
          ) : null}
          {children}
        </dialog>
      ) : null,
  };
});

const mockDefaultDashboardData: DashboardData = {
  courses: [
    {
      id: 1,
      fullname: 'Математичний аналіз',
      shortname: 'МатАналіз',
      summary: '',
    },
  ],
  grades: [
    {
      courseName: 'Математичний аналіз',
      grade: '85',
      currentScore: 45,
      controlType: 'exam',
    },
  ],
  assignments: [
    {
      id: 101,
      courseName: 'Математичний аналіз',
      name: 'Лабораторна робота 1',
      duedate: 1893456000,
      description: 'Test assignment',
    },
  ],
  events: [],
  notifications: [],
  unreadCount: 0,
  statistics: { total: 1 },
};

let mockDashboardState = {
  data: mockDefaultDashboardData,
  setData: vi.fn(),
  loading: false,
  hasLoadedOnce: true,
  lastSyncTime: 1700000000,
  isOfflineData: false,
  studentProfile: null,
  setStudentProfile: vi.fn(),
  fetchData: vi.fn().mockResolvedValue(undefined),
  cancelPendingFetch: vi.fn(),
};

vi.mock('./dashboard/hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashboardState,
  clearUserSessionStorage: vi.fn(),
}));

let mockIsMoodleLinked = true;
const mockOpenLinkModal = vi.fn();

vi.mock('./dashboard/hooks/useMoodleLink', () => ({
  useMoodleLink: () => {
    const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false);
    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = React.useState(false);
    const [linkModalMode, setLinkModalMode] = React.useState<LinkMoodleMode>(
      LinkMoodleMode.CONNECT,
    );

    const openLinkModal = React.useCallback((mode: LinkMoodleMode = LinkMoodleMode.CONNECT) => {
      mockOpenLinkModal(mode);
      setLinkModalMode(mode);
      setIsLinkModalOpen(true);
    }, []);

    return {
      isMoodleLinked: mockIsMoodleLinked,
      linkModalMode,
      isLinkModalOpen,
      isUnlinkModalOpen,
      openLinkModal,
      closeLinkModal: () => setIsLinkModalOpen(false),
      openUnlinkModal: () => setIsUnlinkModalOpen(true),
      closeUnlinkModal: () => setIsUnlinkModalOpen(false),
      handleLinkSuccess: vi.fn(),
      handleUnlinkSuccess: vi.fn(),
    };
  },
}));

const renderDashboard = () => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <FeatureToggleProvider>
          <DashboardPage />
        </FeatureToggleProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMoodleLinked = true;
    mockSearchParams = new URLSearchParams();
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';
    process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES = 'true';
    process.env.NEXT_PUBLIC_FEATURE_PANEL = 'true';

    mockDashboardState = {
      data: mockDefaultDashboardData,
      setData: vi.fn(),
      loading: false,
      hasLoadedOnce: true,
      lastSyncTime: 1700000000,
      isOfflineData: false,
      studentProfile: null,
      setStudentProfile: vi.fn(),
      fetchData: vi.fn().mockResolvedValue(undefined),
      cancelPendingFetch: vi.fn(),
    };
  });

  it('should render loading skeleton when dashboard data is loading', () => {
    mockDashboardState = {
      ...mockDashboardState,
      data: {
        courses: [],
        grades: [],
        assignments: [],
        events: [],
        notifications: [],
        unreadCount: 0,
        statistics: null,
      },
      loading: true,
      hasLoadedOnce: false,
    };

    renderDashboard();

    expect(screen.getByLabelText('Загрузка данных')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Барсуков Родіон Сергійович' }),
    ).not.toBeInTheDocument();
  });

  it('should render dashboard header, sidebar, and default overview tab when data is loaded', () => {
    renderDashboard();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Навігація')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Картка студента / Огляд' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Барсуков Родіон Сергійович' }),
    ).toBeInTheDocument();
  });

  it('should switch active tab when a sidebar navigation item is selected', () => {
    renderDashboard();

    const sidebar = screen.getByLabelText('Навігація');
    const gradesButton = within(sidebar).getByRole('button', { name: 'Заліковка та бали' });

    fireEvent.click(gradesButton);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Заліковка та бали' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Електронна залікова книжка та симулятор оцінок')).toBeInTheDocument();
  });

  it('should open link moodle modal when link moodle action is triggered', () => {
    mockIsMoodleLinked = false;

    renderDashboard();

    const linkButton = screen.getByRole('button', { name: "Прив'язати Moodle" });

    fireEvent.click(linkButton);

    expect(mockOpenLinkModal).toHaveBeenCalledWith(LinkMoodleMode.CONNECT);
    expect(screen.getByRole('dialog', { name: "Прив'язка акаунта Moodle" })).toBeInTheDocument();
  });

  it('should open grade simulator modal when simulator trigger is clicked', () => {
    renderDashboard();

    const sidebar = screen.getByLabelText('Навігація');
    const gradesButton = within(sidebar).getByRole('button', { name: 'Заліковка та бали' });

    fireEvent.click(gradesButton);

    const simulatorTrigger = screen.getByRole('button', {
      name: 'Симулятор балів (Що, якщо?)',
    });

    fireEvent.click(simulatorTrigger);

    expect(
      screen.getByRole('dialog', { name: 'Симулятор оцінок — «Що, якщо?»' }),
    ).toBeInTheDocument();
  });
});
