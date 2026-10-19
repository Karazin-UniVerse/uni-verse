import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { authApi } from '@uni-hub/services/api';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import { createAppProvidersWrapper } from '@uni-hub/utils/with-query-client';
import type { Notification } from '@core/types/moodle';
import { fallbackStudentProfile } from '../constants';
import type { DashboardHeaderProps } from '../types';
import { DashboardHeader } from './DashboardHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockNotifications: Notification[] = [
  {
    id: 1,
    subject: 'Тестове сповіщення 1',
    message: '<p>Повідомлення 1</p>',
    timecreated: 1700000000,
    read: false,
  },
  {
    id: 2,
    subject: 'Тестове сповіщення 2',
    message: '<p>Повідомлення 2</p>',
    timecreated: 1700000100,
    read: false,
  },
];

const defaultProps: DashboardHeaderProps = {
  onOpenMobileMenu: vi.fn(),
  mobileMenuOpen: false,
  soundEnabled: true,
  onToggleSound: vi.fn(),
  notifications: [],
  unreadCount: 0,
  activeStudentProfile: fallbackStudentProfile,
  isMoodleLinked: true,
};

const renderHeader = (props: Partial<DashboardHeaderProps> = {}) => {
  return render(<DashboardHeader {...defaultProps} {...props} />, {
    wrapper: createAppProvidersWrapper(),
  });
};

describe('DashboardHeader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    window.location.href = 'http://localhost/';
    window.localStorage.clear();

    useGamificationStore.setState({
      currentStreak: 0,
      lastActiveDate: null,
      unlockedBadges: [],
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    window.localStorage.clear();
  });

  it('should render header with mobile menu button, notifications, and user dropdown', () => {
    const { rerender } = renderHeader({
      notifications: mockNotifications,
      unreadCount: 2,
      mobileMenuOpen: false,
    });

    const mobileMenuBtn = screen.getByRole('button', { name: /відкрити меню/i });
    const notificationsBtn = screen.getByRole('button', { name: /сповіщення/i });
    const userMenuBtn = screen.getByRole('button', { name: /меню профілю користувача/i });
    const soundBtn = screen.getByRole('button', { name: /вимкнути звук/i });

    expect(mobileMenuBtn).toBeInTheDocument();
    expect(mobileMenuBtn).toHaveAttribute('aria-expanded', 'false');
    expect(mobileMenuBtn).toHaveAttribute('aria-controls', 'dashboard-sidebar');

    expect(notificationsBtn).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(userMenuBtn).toBeInTheDocument();
    expect(screen.getByText(fallbackStudentProfile.fullName)).toBeInTheDocument();

    expect(soundBtn).toBeInTheDocument();

    rerender(
      <DashboardHeader
        {...defaultProps}
        notifications={mockNotifications}
        unreadCount={2}
        mobileMenuOpen={true}
      />,
    );

    expect(screen.getByRole('button', { name: /відкрити меню/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('should call onOpenMobileMenu when mobile menu button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenMobileMenu = vi.fn();

    renderHeader({ onOpenMobileMenu });

    const mobileMenuBtn = screen.getByRole('button', { name: /відкрити меню/i });

    await user.click(mobileMenuBtn);

    expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
  });

  it('should toggle sound when sound toggle button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSound = vi.fn();

    const { rerender } = renderHeader({
      soundEnabled: true,
      onToggleSound,
    });

    const muteBtn = screen.getByRole('button', { name: /вимкнути звук/i });

    await user.click(muteBtn);

    expect(onToggleSound).toHaveBeenCalledTimes(1);

    rerender(
      <DashboardHeader {...defaultProps} soundEnabled={false} onToggleSound={onToggleSound} />,
    );

    const unmuteBtn = screen.getByRole('button', { name: /увімкнути звук/i });

    await user.click(unmuteBtn);

    expect(onToggleSound).toHaveBeenCalledTimes(2);
  });

  it('should render streak badge and dev feature panel when feature panel is enabled', () => {
    process.env.NEXT_PUBLIC_FEATURE_PANEL = 'true';
    useGamificationStore.setState({ currentStreak: 5 });

    renderHeader();

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /відкрити панель перемикачів функцій/i }),
    ).toBeInTheDocument();
  });

  it('should not render dev feature panel when feature panel is disabled', () => {
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
    useGamificationStore.setState({ currentStreak: 3 });

    renderHeader();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /відкрити панель перемикачів функцій/i }),
    ).not.toBeInTheDocument();
  });

  it('should handle logout and redirect to /login', async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);

    renderHeader();

    const userMenuButton = screen.getByRole('button', { name: /меню профілю користувача/i });

    await user.click(userMenuButton);

    const logoutButton = screen.getByRole('button', { name: /вийти/i });

    await user.click(logoutButton);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(window.location.href).toContain('/login');
    });
  });

  it('should clear localStorage fallback and redirect to /login when logout API call fails', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('accessToken', 'test-token');
    window.localStorage.setItem('isLoggedIn', 'true');
    window.localStorage.setItem('moodleToken', 'test-moodle');
    window.localStorage.setItem('universe_dashboard_data', '{"courses":[]}');
    window.localStorage.setItem('universe_last_sync_time', '123456789');

    vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('Logout network error'));

    renderHeader();

    const userMenuButton = screen.getByRole('button', { name: /меню профілю користувача/i });

    await user.click(userMenuButton);

    const logoutButton = screen.getByRole('button', { name: /вийти/i });

    await user.click(logoutButton);

    await waitFor(() => {
      expect(window.location.href).toContain('/login');
    });

    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('isLoggedIn')).toBeNull();
    expect(window.localStorage.getItem('moodleToken')).toBeNull();
    expect(window.localStorage.getItem('universe_dashboard_data')).toBeNull();
    expect(window.localStorage.getItem('universe_last_sync_time')).toBeNull();
  });

  it('should pass moodle link and unlink callbacks to user dropdown', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

    const user = userEvent.setup();
    const onOpenLinkMoodle = vi.fn();
    const onOpenUnlinkMoodle = vi.fn();

    const { rerender } = renderHeader({
      isMoodleLinked: true,
      onOpenLinkMoodle,
      onOpenUnlinkMoodle,
    });

    const userMenuButton = screen.getByRole('button', { name: /меню профілю користувача/i });

    await user.click(userMenuButton);

    const changeAccountBtn = screen.getByRole('button', { name: /змінити акаунт/i });

    await user.click(changeAccountBtn);

    expect(onOpenLinkMoodle).toHaveBeenCalledWith(LinkMoodleMode.CHANGE);

    await user.click(userMenuButton);

    const disconnectBtn = screen.getByRole('button', { name: /від'єднати/i });

    await user.click(disconnectBtn);

    expect(onOpenUnlinkMoodle).toHaveBeenCalledTimes(1);

    rerender(
      <DashboardHeader
        {...defaultProps}
        isMoodleLinked={false}
        onOpenLinkMoodle={onOpenLinkMoodle}
        onOpenUnlinkMoodle={onOpenUnlinkMoodle}
      />,
    );

    await user.click(userMenuButton);

    const connectBtn = screen.getByRole('button', { name: /підключити moodle/i });

    await user.click(connectBtn);

    expect(onOpenLinkMoodle).toHaveBeenCalledWith(LinkMoodleMode.CONNECT);
  });
});
