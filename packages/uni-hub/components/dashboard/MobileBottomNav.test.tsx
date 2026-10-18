import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import * as soundEffects from '@uni-hub/utils/soundEffects';
import styles from './MobileBottomNav.module.scss';
import { MobileBottomNav } from './MobileBottomNav';

describe('MobileBottomNav component', () => {
  const playClickSpy = vi.spyOn(soundEffects, 'playClick');

  beforeEach(() => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';
    process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES = 'true';
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
  });

  it('should render mobile bottom nav with accessible navigation role and visible items', () => {
    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav activeKey={NAV_KEY.Overview} onSelectKey={vi.fn()} soundEnabled />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const nav = screen.getByRole('navigation', { name: 'Мобільна навігація' });
    const buttons = screen.getAllByRole('button');

    expect(nav).toBeInTheDocument();
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /стіна/i })).toBeInTheDocument();
  });

  it('should apply active class to the currently selected item', () => {
    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav activeKey={NAV_KEY.Study} onSelectKey={vi.fn()} soundEnabled />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const activeItem = screen.getByRole('button', { name: /навчання/i });
    const inactiveItem = screen.getByRole('button', { name: /стіна/i });

    expect(activeItem).toHaveClass(styles.active);
    expect(inactiveItem).not.toHaveClass(styles.active);
  });

  it('should trigger onSelectKey and playClick with soundEnabled true when an item is clicked', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
            onSelectKey={handleSelectKey}
            soundEnabled
          />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    const studyButton = screen.getByRole('button', { name: /навчання/i });

    await user.click(studyButton);

    expect(handleSelectKey).toHaveBeenCalledTimes(1);
    expect(handleSelectKey).toHaveBeenCalledWith(NAV_KEY.Study);
    expect(playClickSpy).toHaveBeenCalledWith(true);
  });

  it('should trigger onSelectKey and playClick with soundEnabled false when sound is disabled', async () => {
    const user = userEvent.setup();
    const handleSelectKey = vi.fn();

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav
            activeKey={NAV_KEY.Overview}
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

  it('should hide feature-gated nav items when corresponding feature flags are disabled', () => {
    localStorage.setItem(
      'universe_feature_overrides',
      JSON.stringify({
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: false,
        isOpportunitiesPlatformEnabled: false,
      }),
    );

    render(
      <FeatureToggleProvider>
        <LanguageProvider>
          <MobileBottomNav activeKey={NAV_KEY.Overview} onSelectKey={vi.fn()} soundEnabled />
        </LanguageProvider>
      </FeatureToggleProvider>,
    );

    expect(screen.getByRole('button', { name: /стіна/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /можливості/i })).not.toBeInTheDocument();
  });
});
