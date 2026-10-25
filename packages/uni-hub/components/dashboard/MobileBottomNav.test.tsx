import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  withFeatureToggles,
  withLanguage,
  setTestFeatureFlags,
} from '@uni-hub/utils/test-utils';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import * as soundEffects from '@uni-hub/utils/soundEffects';
import styles from './MobileBottomNav.module.scss';
import { MobileBottomNav } from './MobileBottomNav';

const renderMobileBottomNav = (
  props: Partial<React.ComponentProps<typeof MobileBottomNav>> = {},
) => {
  const defaultProps: React.ComponentProps<typeof MobileBottomNav> = {
    activeKey: NAV_KEY.Overview,
    onSelectKey: vi.fn(),
    soundEnabled: true,
  };

  return render(
    withFeatureToggles(withLanguage(<MobileBottomNav {...defaultProps} {...props} />)),
  );
};

describe('MobileBottomNav component', () => {
  const playClickSpy = vi.spyOn(soundEffects, 'playClick');

  beforeEach(() => {
    setTestFeatureFlags({
      isMoodleIntegrationEnabled: true,
      isEDeanEnabled: true,
      isOpportunitiesPlatformEnabled: true,
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render mobile bottom nav with accessible navigation role and visible items', () => {
    renderMobileBottomNav();

    const nav = screen.getByRole('navigation', { name: 'Мобільна навігація' });
    const buttons = screen.getAllByRole('button');

    expect(nav).toBeInTheDocument();
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /стіна/i })).toBeInTheDocument();
  });

  it('should apply active class to the currently selected item', () => {
    renderMobileBottomNav({ activeKey: NAV_KEY.Study });

    const activeItem = screen.getByRole('button', { name: /навчання/i });
    const inactiveItem = screen.getByRole('button', { name: /стіна/i });

    expect(activeItem).toHaveClass(styles.active);
    expect(inactiveItem).not.toHaveClass(styles.active);
  });

  it('should trigger onSelectKey and playClick with soundEnabled true when an item is clicked', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    renderMobileBottomNav({ onSelectKey: handleSelectKey, soundEnabled: true });

    const studyButton = screen.getByRole('button', { name: /навчання/i });

    await user.click(studyButton);

    expect(handleSelectKey).toHaveBeenCalledTimes(1);
    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.Study);
    expect(playClickSpy).toHaveBeenCalledWith(true);
  });

  it('should trigger onSelectKey and playClick with soundEnabled false when sound is disabled', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    renderMobileBottomNav({ onSelectKey: handleSelectKey, soundEnabled: false });

    const scheduleButton = screen.getByRole('button', { name: /розклад/i });

    await user.click(scheduleButton);

    expect(handleSelectKey).toHaveBeenCalledTimes(1);
    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.Schedule);
    expect(playClickSpy).toHaveBeenCalledWith(false);
  });

  it('should hide feature-gated nav items when corresponding feature flags are disabled', () => {
    localStorage.setItem(
      'universe_feature_overrides',
      JSON.stringify({
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: false,
        isOpportunitiesPlatformEnabled: false,
      }),
    );

    renderMobileBottomNav();

    expect(screen.getByRole('button', { name: /стіна/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /можливості/i })).not.toBeInTheDocument();
  });
});
