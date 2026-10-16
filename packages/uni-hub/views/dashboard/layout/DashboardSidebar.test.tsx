import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import * as soundEffects from '@uni-hub/utils/soundEffects';
import styles from '@uni-hub/views/DashboardPage.module.scss';
import type { FeatureFlags } from '@core/constants/features';
import { NAV_KEY } from '../constants';
import type { DashboardSidebarProps } from '../types';
import { NAV_ITEMS, getVisibleNavItems, DashboardSidebar } from './DashboardSidebar';

const allEnabledFlags: FeatureFlags = {
  isMoodleIntegrationEnabled: true,
  isEDeanEnabled: true,
  isOpportunitiesPlatformEnabled: true,
  isFeaturePanelEnabled: true,
};

const renderSidebar = (props: Partial<DashboardSidebarProps> = {}) => {
  const defaultProps: DashboardSidebarProps = {
    collapsed: false,
    onToggleCollapsed: vi.fn(),
    mobileMenuOpen: false,
    onCloseMobileMenu: vi.fn(),
    activeKey: NAV_KEY.Overview,
    onSelectKey: vi.fn(),
    soundEnabled: false,
    onLogout: vi.fn(),
    isMoodleLinked: true,
    ...props,
  };

  const renderResult = render(
    <FeatureToggleProvider>
      <ThemeProvider>
        <LanguageProvider>
          <DashboardSidebar {...defaultProps} />
        </LanguageProvider>
      </ThemeProvider>
    </FeatureToggleProvider>,
  );

  return {
    ...renderResult,
    props: defaultProps,
  };
};

describe('DashboardSidebar helpers', () => {
  it('should return standard NAV_ITEMS when isMoodleLinked is true', () => {
    const items = getVisibleNavItems(allEnabledFlags, true);

    expect(items).toEqual(NAV_ITEMS);
    expect(items.some((item) => item.key === NAV_KEY.ConnectMoodle)).toBe(false);
  });

  it('should include connectMoodle item when isMoodleLinked is false', () => {
    const items = getVisibleNavItems(allEnabledFlags, false);

    expect(items.length).toBe(NAV_ITEMS.length + 1);
    expect(items.some((item) => item.key === NAV_KEY.ConnectMoodle)).toBe(true);

    const connectItem = items.find((item) => item.key === NAV_KEY.ConnectMoodle);

    expect(connectItem?.labelKey).toBe('nav.connectMoodle.full');
    expect(connectItem?.shortLabelKey).toBe('nav.connectMoodle');
  });
});

describe('DashboardSidebar navigation & feature gating', () => {
  it('should include all navigation items when all feature flags are enabled', () => {
    expect(NAV_ITEMS).toHaveLength(6);

    const visible = getVisibleNavItems(allEnabledFlags, true);

    expect(visible.map((item) => item.key)).toEqual([
      NAV_KEY.Overview,
      NAV_KEY.Courses,
      NAV_KEY.Grades,
      NAV_KEY.Schedule,
      NAV_KEY.Assignments,
      NAV_KEY.Opportunities,
    ]);
  });

  it('should filter out Moodle and Opportunities items when flags are disabled (prod default)', () => {
    const visible = getVisibleNavItems(
      {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
        isFeaturePanelEnabled: false,
      },
      true,
    );

    expect(visible.map((item) => item.key)).toEqual([NAV_KEY.Overview, NAV_KEY.Schedule]);
  });

  it('should retain only overview if all feature flags are turned off', () => {
    const visible = getVisibleNavItems(
      {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: false,
        isOpportunitiesPlatformEnabled: false,
        isFeaturePanelEnabled: false,
      },
      true,
    );

    expect(visible.map((item) => item.key)).toEqual([NAV_KEY.Overview]);
  });
});

describe('DashboardSidebar component rendering & interactions', () => {
  const playClickSpy = vi.spyOn(soundEffects, 'playClick');

  beforeEach(() => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';
    process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES = 'true';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
  });

  it('should render navigation items, active tab styling, and invoke onSelectKey on click', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();
    const handleCloseMobileMenu = vi.fn();

    renderSidebar({
      activeKey: NAV_KEY.Overview,
      onSelectKey: handleSelectKey,
      onCloseMobileMenu: handleCloseMobileMenu,
      soundEnabled: true,
    });

    const overviewBtn = screen.getByRole('button', { name: 'Картка студента / Огляд' });
    const scheduleBtn = screen.getByRole('button', { name: 'Розклад занять' });
    const coursesBtn = screen.getByRole('button', { name: 'Індивідуальний план' });

    expect(overviewBtn).toBeInTheDocument();
    expect(scheduleBtn).toBeInTheDocument();
    expect(coursesBtn).toBeInTheDocument();

    expect(overviewBtn).toHaveClass(styles.active);
    expect(scheduleBtn).not.toHaveClass(styles.active);

    await user.click(scheduleBtn);

    expect(handleSelectKey).toHaveBeenCalledTimes(1);
    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.Schedule);
    expect(handleCloseMobileMenu).toHaveBeenCalledTimes(1);
    expect(playClickSpy).toHaveBeenCalledWith(true);
  });

  it('should toggle collapsed state when collapse toggle button is clicked', async () => {
    const user = userEvent.setup();
    const handleToggleCollapsed = vi.fn();

    const { rerender } = renderSidebar({
      collapsed: false,
      onToggleCollapsed: handleToggleCollapsed,
    });

    const collapseButton = screen.getByRole('button', { name: 'Згорнути меню' });

    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('UNiVerse')).toBeInTheDocument();

    await user.click(collapseButton);

    expect(handleToggleCollapsed).toHaveBeenCalledTimes(1);

    rerender(
      <FeatureToggleProvider>
        <ThemeProvider>
          <LanguageProvider>
            <DashboardSidebar
              collapsed
              onToggleCollapsed={handleToggleCollapsed}
              mobileMenuOpen={false}
              onCloseMobileMenu={vi.fn()}
              activeKey={NAV_KEY.Overview}
              onSelectKey={vi.fn()}
              soundEnabled={false}
              onLogout={vi.fn()}
            />
          </LanguageProvider>
        </ThemeProvider>
      </FeatureToggleProvider>,
    );

    const expandButton = screen.getByRole('button', { name: 'Розгорнути меню' });

    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('should render connectMoodle item when isMoodleLinked is false in component', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    renderSidebar({
      isMoodleLinked: false,
      onSelectKey: handleSelectKey,
    });

    const connectMoodleBtn = screen.getByRole('button', {
      name: 'Підключити акаунт Moodle LMS',
    });

    expect(connectMoodleBtn).toBeInTheDocument();
    expect(connectMoodleBtn).toHaveClass(styles.connectMoodleNavItem);

    await user.click(connectMoodleBtn);

    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.ConnectMoodle);
  });

  it('should invoke onLogout when logout button is clicked', async () => {
    const user = userEvent.setup();
    const handleLogout = vi.fn();

    renderSidebar({
      onLogout: handleLogout,
    });

    const logoutButton = screen.getByRole('button', { name: 'Вийти' });

    await user.click(logoutButton);

    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('should render overlay and close mobile menu when overlay is clicked', async () => {
    const user = userEvent.setup();
    const handleCloseMobileMenu = vi.fn();

    renderSidebar({
      mobileMenuOpen: true,
      onCloseMobileMenu: handleCloseMobileMenu,
    });

    const overlay = screen.getByRole('button', { name: 'Закрити меню' });

    expect(overlay).toBeInTheDocument();

    await user.click(overlay);

    expect(handleCloseMobileMenu).toHaveBeenCalledTimes(1);
  });

  it('should close mobile menu on Escape key press', () => {
    const handleCloseMobileMenu = vi.fn();

    renderSidebar({
      mobileMenuOpen: true,
      onCloseMobileMenu: handleCloseMobileMenu,
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleCloseMobileMenu).toHaveBeenCalledTimes(1);
  });

  it('should render moodle link when moodle feature flag is enabled', () => {
    renderSidebar();

    const moodleLink = screen.getByRole('link', { name: /moodle\.universemvp\.tech/i });

    expect(moodleLink).toBeInTheDocument();
    expect(moodleLink).toHaveAttribute('href', 'https://moodle.universemvp.tech');
  });

  it('should not render moodle link when moodle feature flag is disabled', () => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;

    renderSidebar();

    expect(
      screen.queryByRole('link', { name: /moodle\.universemvp\.tech/i }),
    ).not.toBeInTheDocument();
  });
});
