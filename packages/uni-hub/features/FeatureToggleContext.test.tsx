import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FEATURE_STORAGE_KEYS } from '@core/constants/features';
import { createOverrideStore } from '@core/utils/features';
import { FeatureToggleProvider, useFeatures, useFeatureControls, DevFeaturePanel } from './index';
import { setTestFeatureFlags, resetTestFeatureFlags } from '@uni-hub/utils/test-utils';

describe('FeatureToggleContext and Components', () => {
  beforeEach(() => {
    resetTestFeatureFlags();
    window.localStorage.clear();
  });

  afterEach(() => {
    resetTestFeatureFlags();
    window.localStorage.clear();
  });

  it('should render children with default feature flags in SSR', () => {
    const TestConsumer = () => {
      const {
        isMoodleIntegrationEnabled,
        isEDeanEnabled,
        isOpportunitiesPlatformEnabled,
        isFeaturePanelEnabled,
      } = useFeatures();

      return (
        <div>
          <span data-testid="moodle">{String(isMoodleIntegrationEnabled)}</span>
          <span data-testid="edean">{String(isEDeanEnabled)}</span>
          <span data-testid="opps">{String(isOpportunitiesPlatformEnabled)}</span>
          <span data-testid="panel">{String(isFeaturePanelEnabled)}</span>
        </div>
      );
    };

    render(
      <FeatureToggleProvider>
        <TestConsumer />
      </FeatureToggleProvider>,
    );

    expect(screen.getByTestId('moodle')).toHaveTextContent('false');
    expect(screen.getByTestId('edean')).toHaveTextContent('false');
    expect(screen.getByTestId('opps')).toHaveTextContent('true');
    expect(screen.getByTestId('panel')).toHaveTextContent('false');
  });

  it('should resolve environment variables in FeatureToggleProvider correctly', () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true, isEDeanEnabled: true });

    const TestConsumer = () => {
      const { isMoodleIntegrationEnabled, isEDeanEnabled } = useFeatures();

      return (
        <div>
          <span data-testid="moodle">{String(isMoodleIntegrationEnabled)}</span>
          <span data-testid="edean">{String(isEDeanEnabled)}</span>
        </div>
      );
    };

    render(
      <FeatureToggleProvider>
        <TestConsumer />
      </FeatureToggleProvider>,
    );

    expect(screen.getByTestId('moodle')).toHaveTextContent('true');
    expect(screen.getByTestId('edean')).toHaveTextContent('true');
  });

  it('should apply initialFlags on createOverrideStore correctly', () => {
    const store = createOverrideStore({
      allowOverrides: true,
      initialFlags: { isMoodleIntegrationEnabled: false, isEDeanEnabled: false },
    });

    const snapshot = store.getSnapshot();

    expect(snapshot.isMoodleIntegrationEnabled).toBe(false);
    expect(snapshot.isEDeanEnabled).toBe(false);
  });

  it('should allow overrides in production when NEXT_PUBLIC_FEATURE_PANEL is enabled', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_FEATURE_PANEL = 'true';

    try {
      const TestConsumer = () => {
        const controls = useFeatureControls();

        if (!controls.isOverridden('isMoodleIntegrationEnabled')) {
          controls.setFeatureOverride('isMoodleIntegrationEnabled', false);
        }

        return (
          <span data-testid="is-overridden">
            {String(controls.isOverridden('isMoodleIntegrationEnabled'))}
          </span>
        );
      };

      render(
        <FeatureToggleProvider>
          <TestConsumer />
        </FeatureToggleProvider>,
      );

      expect(screen.getByTestId('is-overridden')).toHaveTextContent('true');
    } finally {
      vi.unstubAllEnvs();
      delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
    }
  });

  it('should throw an error when useFeatures is called outside FeatureToggleProvider', () => {
    const TestConsumer = () => {
      useFeatures();

      return null;
    };

    expect(() => render(<TestConsumer />)).toThrow(
      'useFeatures must be used within a FeatureToggleProvider',
    );
  });

  it('should throw an error when useFeatureControls is called outside FeatureToggleProvider', () => {
    const TestConsumer = () => {
      useFeatureControls();

      return null;
    };

    expect(() => render(<TestConsumer />)).toThrow(
      'useFeatureControls must be used within a FeatureToggleProvider',
    );
  });

  it('should return defaults and helper methods from useFeatureControls', () => {
    const TestConsumer = () => {
      const controls = useFeatureControls();

      return (
        <div>
          <span data-testid="is-overridden">{String(controls.isOverridden())}</span>
          <span data-testid="has-override-fn">
            {String(typeof controls.setFeatureOverride === 'function')}
          </span>
          <span data-testid="has-reset-fn">
            {String(typeof controls.resetFeatureOverrides === 'function')}
          </span>
        </div>
      );
    };

    render(
      <FeatureToggleProvider>
        <TestConsumer />
      </FeatureToggleProvider>,
    );

    expect(screen.getByTestId('is-overridden')).toHaveTextContent('false');
    expect(screen.getByTestId('has-override-fn')).toHaveTextContent('true');
    expect(screen.getByTestId('has-reset-fn')).toHaveTextContent('true');
  });

  it('should render DevFeaturePanel trigger button', () => {
    render(
      <FeatureToggleProvider>
        <DevFeaturePanel />
      </FeatureToggleProvider>,
    );

    const button = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', expect.stringContaining('Ctrl+Shift+F'));
    expect(button).toHaveAttribute('title', expect.stringContaining('Панель функцій'));
  });

  describe('localStorage persistence and production safeguard', () => {
    it('should load feature overrides from localStorage when allowOverrides is true', () => {
      window.localStorage.setItem(
        FEATURE_STORAGE_KEYS.OVERRIDES,
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );

      const store = createOverrideStore({ allowOverrides: true });
      const snapshot = store.getSnapshot();

      expect(snapshot.isOpportunitiesPlatformEnabled).toBe(true);
    });

    it('should ignore localStorage overrides and block changes when allowOverrides is false (production safeguard)', () => {
      window.localStorage.setItem(
        FEATURE_STORAGE_KEYS.OVERRIDES,
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );

      const store = createOverrideStore({ allowOverrides: false });
      const snapshot = store.getSnapshot();

      expect(snapshot.isOpportunitiesPlatformEnabled).toBeUndefined();

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      expect(window.localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES)).toBe(
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBeUndefined();
    });

    it('should persist setOverride and reset to localStorage when allowOverrides is true', () => {
      const store = createOverrideStore({ allowOverrides: true });

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      expect(window.localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES)).toContain(
        '"isOpportunitiesPlatformEnabled":true',
      );
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBe(true);

      store.reset();
      expect(window.localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES)).toBeNull();
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBeUndefined();
    });
  });
});
