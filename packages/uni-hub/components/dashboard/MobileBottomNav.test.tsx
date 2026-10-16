import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FeatureFlags } from '@core/constants/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import * as soundEffects from '@uni-hub/utils/soundEffects';
import { MobileBottomNav, type MobileBottomNavItem } from './MobileBottomNav';

const allEnabledFlags: FeatureFlags = {
  isMoodleIntegrationEnabled: true,
  isEDeanEnabled: true,
  isOpportunitiesPlatformEnabled: true,
  isFeaturePanelEnabled: true,
};

describe('MobileBottomNav component', () => {
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

  it('should render mobile bottom nav with accessible navigation role and tab items', () => {
    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            flags={allEnabledFlags}
            onSelectKey={vi.fn()}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const nav = screen.getByRole('navigation', { name: 'Мобільна навігація' });
    const buttons = screen.getAllByRole('button');

    expect(nav).toBeInTheDocument();
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /огляд/i })).toBeInTheDocument();
  });

  it('should trigger onTabChange when a tab item is clicked', async () => {
    const user = userEvent.setup();
    const handleTabChange = vi.fn();

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeTab={NAV_KEY.Overview}
            flags={allEnabledFlags}
            onTabChange={handleTabChange}
            soundEnabled
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const coursesButton = screen.getByRole('button', { name: /індивідуальний план|курси/i });

    await user.click(coursesButton);

    expect(handleTabChange).toHaveBeenCalledTimes(1);
    expect(handleTabChange).toHaveBeenCalledWith(NAV_KEY.Courses);
    expect(playClickSpy).toHaveBeenCalledWith(true);
  });

  it('should reflect active state with aria-current or aria-selected', () => {
    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Grades}
            flags={allEnabledFlags}
            onSelectKey={vi.fn()}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const activeItem = screen.getByRole('button', { name: /заліковка/i });
    const inactiveItem = screen.getByRole('button', { name: /огляд/i });

    expect(activeItem).toHaveAttribute('aria-current', 'page');
    expect(activeItem).toHaveAttribute('aria-selected', 'true');
    expect(inactiveItem).not.toHaveAttribute('aria-current');
    expect(inactiveItem).toHaveAttribute('aria-selected', 'false');
  });

  it('should render badges or notification indicators if present', () => {
    const badges = {
      [NAV_KEY.Assignments]: 5,
      [NAV_KEY.ConnectMoodle]: true,
    };

    const { rerender } = render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            badges={badges}
            flags={allEnabledFlags}
            isMoodleLinked={false}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const countBadge = screen.getByTestId(`badge-${NAV_KEY.Assignments}`);
    const indicatorBadge = screen.getByTestId(`badge-${NAV_KEY.ConnectMoodle}`);

    expect(countBadge).toBeInTheDocument();
    expect(countBadge).toHaveTextContent('5');
    expect(indicatorBadge).toBeInTheDocument();

    rerender(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            badges={{}}
            flags={allEnabledFlags}
            isMoodleLinked
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    expect(screen.queryByTestId(`badge-${NAV_KEY.Assignments}`)).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            className="custom-mobile-nav"
            flags={allEnabledFlags}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const navElement = container.querySelector('nav.custom-mobile-nav');

    expect(navElement).toBeInTheDocument();
  });

  it('should trigger onSelectKey when clicked', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            flags={allEnabledFlags}
            onSelectKey={handleSelectKey}
            soundEnabled={false}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const scheduleButton = screen.getByRole('button', { name: /розклад/i });

    await user.click(scheduleButton);

    expect(handleSelectKey).toHaveBeenCalledTimes(1);
    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.Schedule);
    expect(playClickSpy).toHaveBeenCalledWith(false);
  });

  it('should render custom tabs when items or tabs prop is provided', () => {
    const customTabs: MobileBottomNavItem[] = [
      {
        key: NAV_KEY.Overview,
        label: 'Головна',
        shortLabel: 'Дім',
        icon: <span data-testid="custom-home-icon">icon</span>,
        badge: 2,
      },
      {
        key: NAV_KEY.Courses,
        label: 'Мої курси',
        shortLabel: 'Курси',
      },
    ];

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav activeKey={NAV_KEY.Overview} tabs={customTabs} />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const homeButton = screen.getByRole('button', { name: 'Головна' });
    const customIcon = screen.getByTestId('custom-home-icon');
    const badge = screen.getByTestId(`badge-${NAV_KEY.Overview}`);

    expect(homeButton).toBeInTheDocument();
    expect(screen.getByText('Дім')).toBeInTheDocument();
    expect(customIcon).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: /оцінки/i })).not.toBeInTheDocument();
  });

  it('should render notification indicator for connectMoodle when moodle is unlinked', () => {
    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            flags={allEnabledFlags}
            isMoodleLinked={false}
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const connectIndicator = screen.getByTestId(`badge-${NAV_KEY.ConnectMoodle}`);

    expect(connectIndicator).toBeInTheDocument();
  });
});
