import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FEATURE_STORAGE_KEYS } from '@core/constants/features';
import {
  FeatureToggleProvider,
  useFeatures,
  useFeatureControls,
  DevFeaturePanel,
  createOverrideStore,
} from './index';

describe('FeatureToggleContext and Components', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
    delete process.env.NEXT_PUBLIC_FEATURE_PANEL;
  });

  it('renders children with default feature flags in SSR', () => {
    const TestConsumer = () => {
      const {
        isMoodleIntegrationEnabled,
        isEDeanEnabled,
        isOpportunitiesPlatformEnabled,
        isFeaturePanelEnabled,
      } = useFeatures();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'moodle' }, String(isMoodleIntegrationEnabled)),
        React.createElement('span', { id: 'edean' }, String(isEDeanEnabled)),
        React.createElement('span', { id: 'opps' }, String(isOpportunitiesPlatformEnabled)),
        React.createElement('span', { id: 'panel' }, String(isFeaturePanelEnabled)),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="moodle">true</span>');
    expect(html).toContain('id="edean">true</span>');
    expect(html).toContain('id="opps">false</span>');
    expect(html).toContain('id="panel">false</span>');
  });

  it('applies initialFlags overrides correctly', () => {
    const TestConsumer = () => {
      const { isMoodleIntegrationEnabled, isEDeanEnabled } = useFeatures();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'moodle' }, String(isMoodleIntegrationEnabled)),
        React.createElement('span', { id: 'edean' }, String(isEDeanEnabled)),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      { initialFlags: { isMoodleIntegrationEnabled: false, isEDeanEnabled: false } },
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="moodle">false</span>');
    expect(html).toContain('id="edean">false</span>');
  });

  it('throws an error when useFeatures is called outside FeatureToggleProvider', () => {
    const TestConsumer = () => {
      useFeatures();

      return null;
    };

    expect(() => renderToString(React.createElement(TestConsumer))).toThrow(
      'useFeatures must be used within a FeatureToggleProvider',
    );
  });

  it('throws an error when useFeatureControls is called outside FeatureToggleProvider', () => {
    const TestConsumer = () => {
      useFeatureControls();

      return null;
    };

    expect(() => renderToString(React.createElement(TestConsumer))).toThrow(
      'useFeatureControls must be used within a FeatureToggleProvider',
    );
  });

  it('useFeatureControls returns defaults and helper methods', () => {
    const TestConsumer = () => {
      const controls = useFeatureControls();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'is-overridden' }, String(controls.isOverridden())),
        React.createElement(
          'span',
          { id: 'has-override-fn' },
          String(typeof controls.setFeatureOverride === 'function'),
        ),
        React.createElement(
          'span',
          { id: 'has-reset-fn' },
          String(typeof controls.resetFeatureOverrides === 'function'),
        ),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="is-overridden">false</span>');
    expect(html).toContain('id="has-override-fn">true</span>');
    expect(html).toContain('id="has-reset-fn">true</span>');
  });

  it('renders DevFeaturePanel trigger button in SSR', () => {
    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(DevFeaturePanel),
    );

    const html = renderToString(tree);

    expect(html).toContain('Ctrl+Shift+F');
    expect(html).toContain('Панель функцій');
  });

  describe('localStorage persistence and production safeguard', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};

      const mockLocalStorage: Storage = {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        key: () => null,
        length: 0,
      };

      (global as unknown as { window?: unknown }).window = {
        localStorage: mockLocalStorage,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    });

    afterEach(() => {
      delete (global as unknown as { window?: unknown }).window;
    });

    it('loads feature overrides from localStorage when allowOverrides is true', () => {
      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = JSON.stringify({
        isOpportunitiesPlatformEnabled: true,
      });

      const store = createOverrideStore({ allowOverrides: true });
      const snapshot = store.getSnapshot();

      expect(snapshot.isOpportunitiesPlatformEnabled).toBe(true);
    });

    it('ignores localStorage overrides and blocks changes when allowOverrides is false (production safeguard)', () => {
      mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES] = JSON.stringify({
        isOpportunitiesPlatformEnabled: true,
      });

      const store = createOverrideStore({ allowOverrides: false });
      const snapshot = store.getSnapshot();

      expect(snapshot.isOpportunitiesPlatformEnabled).toBeUndefined();

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      expect(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES]).toBe(
        JSON.stringify({ isOpportunitiesPlatformEnabled: true }),
      );
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBeUndefined();
    });

    it('persists setOverride and reset to localStorage when allowOverrides is true', () => {
      const store = createOverrideStore({ allowOverrides: true });

      store.setOverride('isOpportunitiesPlatformEnabled', true);
      expect(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES]).toContain(
        '"isOpportunitiesPlatformEnabled":true',
      );
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBe(true);

      store.reset();
      expect(mockStorage[FEATURE_STORAGE_KEYS.OVERRIDES]).toBeUndefined();
      expect(store.getSnapshot().isOpportunitiesPlatformEnabled).toBeUndefined();
    });
  });
});
